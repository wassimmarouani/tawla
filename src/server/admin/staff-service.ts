import 'server-only';
import { and, count, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { createTranslator } from 'next-intl';
import { escalationCandidates, type LiveRequest } from '@/features/staff';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { loadMessages } from '@/messages';
import { rawDb } from '@/lib/db/client';
import {
  memberships,
  notificationIncidents,
  notificationReceipts,
  restaurants,
  serviceRequests,
  tableSessions,
} from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import { log } from '@/lib/log';
import { pushToMembers } from './push';

/**
 * Staff side of service requests (P1-12, spec 03, ADR-0007): the live list, the atomic claim,
 * "done", receipt acks, push on creation and escalation. Privileged: callers have checked the
 * staff context (paired device + live staff session) or the cron secret.
 */

/** Requests of the current shift a device may show (open, or claimed but not done). */
export async function listLiveRequests(restaurantId: string): Promise<LiveRequest[]> {
  const rows = await rawDb().execute<{
    id: string;
    kind: 'waiter' | 'bill';
    status: LiveRequest['status'];
    table_number: number;
    table_label: string | null;
    payment_method: 'cash' | 'card' | null;
    created_at: string;
    claimed_by: string | null;
    claimed_by_name: string | null;
    version: number;
  }>(sql`
    select r.id, r.kind, r.status, t.number as table_number, t.label as table_label,
      r.payment_method, r.created_at, r.claimed_by,
      coalesce(m.display_name, u.email) as claimed_by_name, r.version
    from public.service_requests r
    join public.table_sessions s on s.restaurant_id = r.restaurant_id and s.id = r.table_session_id
    join public.tables t on t.restaurant_id = s.restaurant_id and t.id = s.table_id
    left join public.memberships m on m.restaurant_id = r.restaurant_id and m.user_id = r.claimed_by
    left join auth.users u on u.id = r.claimed_by
    where r.restaurant_id = ${restaurantId}
      and r.status in ('open', 'claimed')
      and r.created_at > now() - interval '12 hours'
    order by r.created_at`);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    tableNumber: row.table_number,
    tableLabel: row.table_label,
    paymentMethod: row.payment_method,
    createdAt: new Date(row.created_at).toISOString(),
    claimedBy: row.claimed_by,
    claimedByName: row.claimed_by_name,
    version: row.version,
  }));
}

async function conflict(restaurantId: string, requestId: string): Promise<never> {
  const [row] = await rawDb().execute<{ status: string; name: string | null }>(sql`
    select r.status, coalesce(m.display_name, u.email) as name
    from public.service_requests r
    left join public.memberships m on m.restaurant_id = r.restaurant_id and m.user_id = r.claimed_by
    left join auth.users u on u.id = r.claimed_by
    where r.restaurant_id = ${restaurantId} and r.id = ${requestId}`);
  if (!row) throw new AppError('NOT_FOUND', 'Request not found');
  throw new AppError('ORDER_STATE_CONFLICT', 'Request already handled', {
    reason: row.status === 'claimed' ? 'alreadyClaimed' : 'alreadyDone',
    by: row.name,
  });
}

/** "I'm on it": atomic (only an open request can be claimed, ADR-0006 style conditional update). */
export async function claimRequest(input: {
  restaurantId: string;
  requestId: string;
  userId: string;
}): Promise<{ version: number }> {
  const [row] = await rawDb()
    .update(serviceRequests)
    .set({ status: 'claimed', claimedBy: input.userId, claimedAt: sql`now()` })
    .where(
      and(
        eq(serviceRequests.restaurantId, input.restaurantId),
        eq(serviceRequests.id, input.requestId),
        eq(serviceRequests.status, 'open'),
      ),
    )
    .returning({ version: serviceRequests.version });
  if (!row) return conflict(input.restaurantId, input.requestId);
  return row;
}

/**
 * "Done". A handled bill request closes the table session on Basic (spec 02: the table's phones
 * fall back to read-only and are offered feedback).
 */
export async function completeRequest(input: {
  restaurantId: string;
  requestId: string;
  userId: string;
}): Promise<{ version: number }> {
  return rawDb().transaction(async (tx) => {
    const [row] = await tx
      .update(serviceRequests)
      .set({
        status: 'done',
        doneAt: sql`now()`,
        claimedBy: sql`coalesce(${serviceRequests.claimedBy}, ${input.userId}::uuid)`,
        claimedAt: sql`coalesce(${serviceRequests.claimedAt}, now())`,
      })
      .where(
        and(
          eq(serviceRequests.restaurantId, input.restaurantId),
          eq(serviceRequests.id, input.requestId),
          inArray(serviceRequests.status, ['open', 'claimed']),
        ),
      )
      .returning({
        version: serviceRequests.version,
        kind: serviceRequests.kind,
        tableSessionId: serviceRequests.tableSessionId,
      });
    if (!row) return conflict(input.restaurantId, input.requestId);
    if (row.kind === 'bill') {
      await tx
        .update(tableSessions)
        .set({ status: 'closed', closedAt: sql`now()`, closedBy: input.userId })
        .where(
          and(
            eq(tableSessions.restaurantId, input.restaurantId),
            eq(tableSessions.id, row.tableSessionId),
            sql`${tableSessions.status} <> 'closed'`,
          ),
        );
    }
    return { version: row.version };
  });
}

/** Receipt acks (ADR-0007 §3): idempotent; ids from other restaurants are ignored. */
export async function recordAcks(input: {
  restaurantId: string;
  userId: string;
  deviceId: string;
  eventIds: readonly string[];
}): Promise<number> {
  if (input.eventIds.length === 0) return 0;
  const known = await rawDb()
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.restaurantId, input.restaurantId),
        inArray(serviceRequests.id, [...input.eventIds]),
      ),
    );
  if (known.length === 0) return 0;
  const rows = await rawDb()
    .insert(notificationReceipts)
    .values(
      known.map((event) => ({
        restaurantId: input.restaurantId,
        eventId: event.id,
        eventKind: 'request',
        userId: input.userId,
        deviceId: input.deviceId,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: notificationReceipts.id });
  return rows.length;
}

/** Push texts in the restaurant's default language (pushes reach every device of the venue). */
async function pushTranslator(restaurantId: string) {
  const [row] = await rawDb()
    .select({ locale: restaurants.defaultLocale })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId));
  const locale = isLocale(row?.locale) ? row.locale : DEFAULT_LOCALE;
  return createTranslator({
    locale,
    messages: await loadMessages(locale),
    namespace: 'staff.push',
  });
}

/**
 * Push to every active member's devices when a customer calls (Basic: no zones, spec 03). The
 * notification tag is the request id, so a replayed request replaces it instead of ringing twice.
 */
export async function notifyStaffOfRequest(input: {
  restaurantId: string;
  requestId: string;
}): Promise<void> {
  try {
    const [request] = await rawDb().execute<{
      kind: 'waiter' | 'bill';
      payment_method: 'cash' | 'card' | null;
      number: number;
    }>(sql`
      select r.kind, r.payment_method, t.number
      from public.service_requests r
      join public.table_sessions s on s.restaurant_id = r.restaurant_id and s.id = r.table_session_id
      join public.tables t on t.restaurant_id = s.restaurant_id and t.id = s.table_id
      where r.restaurant_id = ${input.restaurantId} and r.id = ${input.requestId}`);
    if (!request) return;
    const t = await pushTranslator(input.restaurantId);
    let body = t('waiter');
    if (request.kind === 'bill')
      body = t(request.payment_method === 'card' ? 'billCard' : 'billCash');
    await pushToMembers(input.restaurantId, null, {
      title: t('title', { number: request.number }),
      body,
      tag: input.requestId,
      url: '/staff',
    });
  } catch (error) {
    // Push is the secondary channel (ADR-0007 §5): never fail the customer's request for it.
    log.warn('push.request_failed', { cause: String(error) });
  }
}

/**
 * Escalation run (ADR-0007 §4, every 15 s): new "unclaimed" (2 min) and "no_ack" (15 s)
 * incidents, each pushed once to the owners and managers. Idempotent.
 */
export async function escalateRequests(now = new Date()): Promise<{
  unclaimed: number;
  noAck: number;
}> {
  const db = rawDb();
  const open = await db
    .select({
      id: serviceRequests.id,
      restaurantId: serviceRequests.restaurantId,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      receipts: count(notificationReceipts.id),
    })
    .from(serviceRequests)
    .leftJoin(notificationReceipts, eq(notificationReceipts.eventId, serviceRequests.id))
    .where(
      and(
        eq(serviceRequests.status, 'open'),
        gt(serviceRequests.createdAt, sql`now() - interval '1 hour'`),
      ),
    )
    .groupBy(serviceRequests.id);
  const candidates = escalationCandidates(
    open.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: new Date(row.createdAt),
      receipts: row.receipts,
    })),
    now,
  );
  const restaurantOf = new Map(open.map((row) => [row.id, row.restaurantId]));
  const insert = async (ids: string[], kind: 'unclaimed' | 'no_ack') => {
    if (ids.length === 0) return [];
    return db
      .insert(notificationIncidents)
      .values(
        ids.map((id) => ({
          restaurantId: restaurantOf.get(id) ?? '',
          eventId: id,
          eventKind: 'request',
          kind,
        })),
      )
      .onConflictDoNothing()
      .returning({
        eventId: notificationIncidents.eventId,
        restaurantId: notificationIncidents.restaurantId,
      });
  };
  const unclaimed = await insert(candidates.unclaimed, 'unclaimed');
  const noAck = await insert(candidates.noAck, 'no_ack');

  for (const incident of [...unclaimed, ...noAck]) {
    const managers = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.restaurantId, incident.restaurantId),
          eq(memberships.isActive, true),
          inArray(memberships.role, ['owner', 'manager']),
        ),
      );
    if (managers.length === 0) continue;
    const [details] = await db.execute<{ number: number }>(sql`
      select t.number from public.service_requests r
      join public.table_sessions s on s.id = r.table_session_id
      join public.tables t on t.id = s.table_id
      where r.id = ${incident.eventId}`);
    const t = await pushTranslator(incident.restaurantId);
    await pushToMembers(
      incident.restaurantId,
      managers.map((manager) => manager.id),
      {
        title: t('title', { number: details?.number ?? 0 }),
        body: t('escalated'),
        tag: `escalation-${incident.eventId}`,
        url: '/staff',
      },
    );
  }
  return { unclaimed: unclaimed.length, noAck: noAck.length };
}

/** Marks incidents of handled requests resolved (Milestone 2 metrics). */
export async function resolveIncidents(requestId: string): Promise<void> {
  await rawDb()
    .update(notificationIncidents)
    .set({ resolvedAt: sql`now()` })
    .where(
      and(eq(notificationIncidents.eventId, requestId), isNull(notificationIncidents.resolvedAt)),
    );
}
