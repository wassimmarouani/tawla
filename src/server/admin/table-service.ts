import 'server-only';
import { and, desc, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  FEEDBACK_PER_SESSION,
  REQUEST_COOLDOWN_SECONDS,
  cooldownRemaining,
  type ClientSessionClaims,
  type RequestSnapshot,
  type SessionState,
} from '@/features/table-service';
import { rawDb } from '@/lib/db/client';
import type { DbTransaction } from '@/lib/db/rls';
import {
  clientSessions,
  feedbacks,
  idempotencyKeys,
  menuViews,
  options,
  products,
  restaurants,
  serviceRequests,
  tableSessions,
  tables,
} from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';

/**
 * Customer-side writes (ADR-0011, ADR-0016): anonymous phones have no database identity, so
 * public route handlers call these privileged functions after validating input. Every function
 * re-derives the restaurant from the token or the signed cookie, never from the request body.
 */

export interface OpenedSession {
  restaurantId: string;
  tableSessionId: string;
  tableSessionPublicId: string;
  clientSessionId: string;
}

/**
 * Opens (or joins) the table's session and the phone's client session (ADR-0011 §3). Phones
 * at the same table share the table session; the same phone keeps its client session.
 */
export async function openClientSession(token: string, deviceId: string): Promise<OpenedSession> {
  return rawDb().transaction(async (tx) => {
    const [table] = await tx
      .select({ id: tables.id, restaurantId: tables.restaurantId })
      .from(tables)
      .innerJoin(restaurants, eq(restaurants.id, tables.restaurantId))
      .where(
        and(
          eq(tables.token, token),
          isNull(tables.deletedAt),
          eq(tables.isActive, true),
          isNull(restaurants.deletedAt),
          eq(restaurants.status, 'active'),
        ),
      )
      .limit(1);
    if (!table) throw new AppError('TABLE_TOKEN_INVALID', 'Unknown or inactive table token');

    const openSession = () =>
      tx
        .select({ id: tableSessions.id, publicId: tableSessions.publicId })
        .from(tableSessions)
        .where(and(eq(tableSessions.tableId, table.id), ne(tableSessions.status, 'closed')))
        .limit(1);
    let [session] = await openSession();
    if (!session) {
      // Two phones may scan at once: the partial unique index lets only one insert win.
      [session] = await tx
        .insert(tableSessions)
        .values({ restaurantId: table.restaurantId, tableId: table.id })
        .onConflictDoNothing()
        .returning({ id: tableSessions.id, publicId: tableSessions.publicId });
      session ??= (await openSession())[0];
    }
    if (!session) throw new AppError('INTERNAL', 'Table session could not be opened');

    const [existing] = await tx
      .select({ id: clientSessions.id })
      .from(clientSessions)
      .where(
        and(
          eq(clientSessions.restaurantId, table.restaurantId),
          eq(clientSessions.tableSessionId, session.id),
          eq(clientSessions.deviceId, deviceId),
        ),
      )
      .limit(1);
    const clientSessionId =
      existing?.id ??
      (
        await tx
          .insert(clientSessions)
          .values({ restaurantId: table.restaurantId, tableSessionId: session.id, deviceId })
          .returning({ id: clientSessions.id })
      )[0]?.id;
    if (!clientSessionId) throw new AppError('INTERNAL', 'Client session insert returned no row');

    await tx
      .update(tableSessions)
      .set({ lastActivityAt: sql`now()` })
      .where(eq(tableSessions.id, session.id));
    return {
      restaurantId: table.restaurantId,
      tableSessionId: session.id,
      tableSessionPublicId: session.publicId,
      clientSessionId,
    };
  });
}

/**
 * A live client session: its table session is still open, belongs to the table of `tableToken`
 * (a phone that moved tables must join the new one) and the phone is not blocked.
 */
async function liveClientSession(
  tx: DbTransaction,
  clientSessionId: string,
  restaurantId: string,
  tableToken: string,
) {
  const [row] = await tx
    .select({
      tableSessionId: clientSessions.tableSessionId,
      blockedUntil: clientSessions.blockedUntil,
      status: tableSessions.status,
      publicId: tableSessions.publicId,
    })
    .from(clientSessions)
    .innerJoin(
      tableSessions,
      and(
        eq(tableSessions.restaurantId, clientSessions.restaurantId),
        eq(tableSessions.id, clientSessions.tableSessionId),
      ),
    )
    .innerJoin(
      tables,
      and(
        eq(tables.restaurantId, tableSessions.restaurantId),
        eq(tables.id, tableSessions.tableId),
      ),
    )
    .where(
      and(
        eq(clientSessions.id, clientSessionId),
        eq(clientSessions.restaurantId, restaurantId),
        eq(tables.token, tableToken),
      ),
    )
    .limit(1);
  if (!row || row.status === 'closed') {
    throw new AppError('SESSION_EXPIRED', 'The table session is closed');
  }
  if (row.blockedUntil && new Date(row.blockedUntil) > new Date()) {
    throw new AppError('FORBIDDEN', 'This device is blocked', { reason: 'deviceBlocked' });
  }
  return row;
}

const reviewUrlSchema = z.url({ protocol: /^https$/ }).max(500);

/**
 * The phone's view of its table session (`GET /api/public/session`), or `null` when its cookie
 * belongs to another table (a phone that moved, or a regenerated QR). Read-only.
 */
export async function clientSessionState(
  claims: ClientSessionClaims,
  token: string,
): Promise<SessionState | null> {
  const db = rawDb();
  const [session] = await db
    .select({
      publicId: tableSessions.publicId,
      status: tableSessions.status,
      settings: restaurants.settings,
    })
    .from(tableSessions)
    .innerJoin(
      tables,
      and(
        eq(tables.restaurantId, tableSessions.restaurantId),
        eq(tables.id, tableSessions.tableId),
      ),
    )
    .innerJoin(restaurants, eq(restaurants.id, tableSessions.restaurantId))
    .where(
      and(
        eq(tableSessions.id, claims.ts),
        eq(tableSessions.restaurantId, claims.r),
        eq(tables.token, token),
        isNull(tables.deletedAt),
      ),
    )
    .limit(1);
  if (!session) return null;

  const [recent, [feedbackCount]] = await Promise.all([
    db
      .select({
        id: serviceRequests.id,
        kind: serviceRequests.kind,
        status: serviceRequests.status,
        version: serviceRequests.version,
        paymentMethod: serviceRequests.paymentMethod,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.restaurantId, claims.r),
          eq(serviceRequests.tableSessionId, claims.ts),
        ),
      )
      .orderBy(desc(serviceRequests.createdAt))
      .limit(20),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(feedbacks)
      .where(and(eq(feedbacks.restaurantId, claims.r), eq(feedbacks.tableSessionId, claims.ts))),
  ]);
  const now = new Date();
  const latest = (kind: 'waiter' | 'bill'): RequestSnapshot | null => {
    const row = recent.find((request) => request.kind === kind);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      version: row.version,
      paymentMethod: row.paymentMethod,
      retryAfterSeconds: cooldownRemaining(new Date(row.createdAt), now, REQUEST_COOLDOWN_SECONDS),
    };
  };
  const settings = session.settings as { google_review_url?: unknown } | null;
  const reviewUrl = reviewUrlSchema.safeParse(settings?.google_review_url);
  return {
    tableSessionPublicId: session.publicId,
    status: session.status,
    requests: { waiter: latest('waiter'), bill: latest('bill') },
    feedbackOpen: (feedbackCount?.value ?? 0) < FEEDBACK_PER_SESSION,
    reviewUrl: reviewUrl.success ? reviewUrl.data : null,
  };
}

/** Stored as the idempotent response; the s: topic capability lets the phone follow it. */
const createdRequestSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['waiter', 'bill']),
  status: z.string(),
  tableSessionPublicId: z.string(),
});
export type CreatedRequest = z.infer<typeof createdRequestSchema>;

/**
 * "Call waiter" / "Request bill" (spec 03): idempotent per key, with a per-table cooldown per
 * kind (ADR-0011 §7). A bill request marks the table session `bill_requested`.
 */
export async function createServiceRequest(input: {
  restaurantId: string;
  clientSessionId: string;
  tableToken: string;
  kind: 'waiter' | 'bill';
  paymentMethod: 'cash' | 'card' | null;
  idempotencyKey: string;
  cooldownSeconds: number;
}): Promise<CreatedRequest> {
  return rawDb().transaction(async (tx) => {
    const session = await liveClientSession(
      tx,
      input.clientSessionId,
      input.restaurantId,
      input.tableToken,
    );

    const [replay] = await tx
      .select({ response: idempotencyKeys.response })
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.restaurantId, input.restaurantId),
          eq(idempotencyKeys.scope, 'service_request'),
          eq(idempotencyKeys.key, input.idempotencyKey),
        ),
      );
    if (replay) return createdRequestSchema.parse(replay.response);

    // Serialises concurrent requests of the same table (cooldown check below).
    await tx.execute(
      sql`select 1 from public.table_sessions where id = ${session.tableSessionId} for update`,
    );
    const [last] = await tx
      .select({ createdAt: serviceRequests.createdAt })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.restaurantId, input.restaurantId),
          eq(serviceRequests.tableSessionId, session.tableSessionId),
          eq(serviceRequests.kind, input.kind),
          gt(
            serviceRequests.createdAt,
            sql`now() - make_interval(secs => ${input.cooldownSeconds})`,
          ),
        ),
      )
      .orderBy(desc(serviceRequests.createdAt))
      .limit(1);
    const wait = last
      ? cooldownRemaining(new Date(last.createdAt), new Date(), input.cooldownSeconds)
      : 0;
    if (wait > 0) {
      throw new AppError('RATE_LIMITED', 'Request cooldown', { retryAfterSeconds: wait });
    }

    const [request] = await tx
      .insert(serviceRequests)
      .values({
        restaurantId: input.restaurantId,
        tableSessionId: session.tableSessionId,
        clientSessionId: input.clientSessionId,
        kind: input.kind,
        paymentMethod: input.paymentMethod,
      })
      .returning({ id: serviceRequests.id, status: serviceRequests.status });
    if (!request) throw new AppError('INTERNAL', 'Request insert returned no row');

    await tx
      .update(tableSessions)
      .set({
        lastActivityAt: sql`now()`,
        ...(input.kind === 'bill'
          ? { status: 'bill_requested' as const, paymentMethod: input.paymentMethod }
          : {}),
      })
      .where(eq(tableSessions.id, session.tableSessionId));
    await tx
      .update(clientSessions)
      .set({ lastSeenAt: sql`now()` })
      .where(eq(clientSessions.id, input.clientSessionId));

    const response: CreatedRequest = {
      id: request.id,
      kind: input.kind,
      status: request.status,
      tableSessionPublicId: session.publicId,
    };
    await tx.insert(idempotencyKeys).values({
      restaurantId: input.restaurantId,
      scope: 'service_request',
      key: input.idempotencyKey,
      response,
    });
    return response;
  });
}

/** Rating after the bill (spec 02), a few per table session at most. */
export async function createFeedback(input: {
  restaurantId: string;
  clientSessionId: string;
  rating: number;
  comment: string | null;
  maxPerSession: number;
}): Promise<void> {
  await rawDb().transaction(async (tx) => {
    const [row] = await tx
      .select({ tableSessionId: clientSessions.tableSessionId })
      .from(clientSessions)
      .where(
        and(
          eq(clientSessions.id, input.clientSessionId),
          eq(clientSessions.restaurantId, input.restaurantId),
        ),
      );
    if (!row) throw new AppError('SESSION_EXPIRED', 'Unknown client session');
    const [count] = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.restaurantId, input.restaurantId),
          eq(feedbacks.tableSessionId, row.tableSessionId),
        ),
      );
    if ((count?.value ?? 0) >= input.maxPerSession) {
      throw new AppError('RATE_LIMITED', 'Feedback limit reached', { retryAfterSeconds: 3600 });
    }
    await tx.insert(feedbacks).values({
      restaurantId: input.restaurantId,
      tableSessionId: row.tableSessionId,
      rating: input.rating,
      comment: input.comment,
    });
  });
}

/** Counts a menu view for statistics; unknown slugs and tokens are ignored. */
export async function recordMenuView(input: { slug: string } | { token: string }): Promise<void> {
  const db = rawDb();
  if ('token' in input) {
    const [table] = await db
      .select({ id: tables.id, restaurantId: tables.restaurantId })
      .from(tables)
      .where(and(eq(tables.token, input.token), isNull(tables.deletedAt)))
      .limit(1);
    if (table)
      await db.insert(menuViews).values({ restaurantId: table.restaurantId, tableId: table.id });
    return;
  }
  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(and(eq(restaurants.slug, input.slug), isNull(restaurants.deletedAt)))
    .limit(1);
  if (restaurant) await db.insert(menuViews).values({ restaurantId: restaurant.id });
}

export interface Availability {
  products: { id: string; isAvailable: boolean; version: number }[];
  options: { id: string; isAvailable: boolean; version: number }[];
}

/** Live availability of a public menu, for refreshes on focus (ADR-0008 §5). */
export async function menuAvailability(slug: string): Promise<Availability | null> {
  const db = rawDb();
  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.slug, slug),
        isNull(restaurants.deletedAt),
        inArray(restaurants.status, ['active', 'read_only']),
      ),
    )
    .limit(1);
  if (!restaurant) return null;
  const [productRows, optionRows] = await Promise.all([
    db
      .select({ id: products.id, isAvailable: products.isAvailable, version: products.version })
      .from(products)
      .where(
        and(
          eq(products.restaurantId, restaurant.id),
          isNull(products.deletedAt),
          eq(products.isVisible, true),
        ),
      ),
    db
      .select({ id: options.id, isAvailable: options.isAvailable, version: options.version })
      .from(options)
      .where(and(eq(options.restaurantId, restaurant.id), isNull(options.deletedAt))),
  ]);
  return { products: productRows, options: optionRows };
}
