import {
  REALTIME_SUBSCRIBE_STATES as STATE,
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { clientSessions, serviceRequests, tableSessions, tables } from '@/lib/db/schema/schema';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { createVenue } from './onboarding';
import {
  createFeedback,
  createServiceRequest,
  menuAvailability,
  openClientSession,
  recordMenuView,
} from './table-service';

/** Customer sessions and service requests (P1-09, ADR-0011, ADR-0016). Local Supabase. */

const EMAIL = 'table-service-owner@example.org';
const PASSWORD = 'correct-horse-battery-staple';
const SLUG = 'table-service-cafe';
const ctx = { restaurantId: '', tokens: [] as string[] };
const clients: SupabaseClient[] = [];

const DEVICE_A = 'phoneAphoneAphoneA01';
const DEVICE_B = 'phoneBphoneBphoneB01';

async function cleanup() {
  const db = rawDb();
  await db.execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await db.execute(sql`delete from auth.users where email = ${EMAIL}`);
}

beforeAll(async () => {
  await cleanup();
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const venue = await createVenue({
    ownerId: data.user.id,
    venueName: 'Table service',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  ctx.restaurantId = venue.restaurantId;
  const rows = await rawDb()
    .insert(tables)
    .values([1, 2, 3, 4].map((number) => ({ restaurantId: venue.restaurantId, number })))
    .returning({ token: tables.token });
  ctx.tokens = rows.map((row) => row.token);
}, 60_000);

afterAll(async () => {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
  await cleanup();
});

const request = (clientSessionId: string, key: string, kind: 'waiter' | 'bill' = 'waiter') =>
  createServiceRequest({
    restaurantId: ctx.restaurantId,
    clientSessionId,
    kind,
    paymentMethod: kind === 'bill' ? 'cash' : null,
    idempotencyKey: key,
    cooldownSeconds: 60,
  });

describe('table sessions (P1-09)', () => {
  it('lets two phones join one table session, each with its own client session', async () => {
    const first = await openClientSession(ctx.tokens[0] ?? '', DEVICE_A);
    const second = await openClientSession(ctx.tokens[0] ?? '', DEVICE_B);
    const again = await openClientSession(ctx.tokens[0] ?? '', DEVICE_A);
    expect(second.tableSessionId).toBe(first.tableSessionId);
    expect(second.clientSessionId).not.toBe(first.clientSessionId);
    expect(again.clientSessionId).toBe(first.clientSessionId);
    await expect(openClientSession('unknown-token-unknown0', DEVICE_A)).rejects.toMatchObject({
      code: 'TABLE_TOKEN_INVALID',
    });
  });

  it('opens one session when phones scan at the same time', async () => {
    const opened = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        openClientSession(ctx.tokens[1] ?? '', `concurrentPhone${String(index)}xxx`),
      ),
    );
    expect(new Set(opened.map((session) => session.tableSessionId)).size).toBe(1);
  });

  it('is idempotent per key and applies the per-table cooldown', async () => {
    const phone = await openClientSession(ctx.tokens[2] ?? '', DEVICE_A);
    const other = await openClientSession(ctx.tokens[2] ?? '', DEVICE_B);
    const created = await request(phone.clientSessionId, 'idem-key-0001');
    const replayed = await request(phone.clientSessionId, 'idem-key-0001');
    expect(replayed).toEqual(created);
    const count = await rawDb()
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.tableSessionId, phone.tableSessionId));
    expect(count).toHaveLength(1);

    // Another phone at the same table hits the same cooldown.
    await expect(request(other.clientSessionId, 'idem-key-0002')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: expect.any(Number) as number },
    });
    // A bill request is another kind: allowed, and marks the table.
    await request(other.clientSessionId, 'idem-key-0003', 'bill');
    const [session] = await rawDb()
      .select({ status: tableSessions.status, paymentMethod: tableSessions.paymentMethod })
      .from(tableSessions)
      .where(eq(tableSessions.id, phone.tableSessionId));
    expect(session).toEqual({ status: 'bill_requested', paymentMethod: 'cash' });
  });

  it('closes idle sessions with their client sessions; later requests expire', async () => {
    const phone = await openClientSession(ctx.tokens[3] ?? '', DEVICE_A);
    await rawDb()
      .update(tableSessions)
      .set({ lastActivityAt: sql`now() - interval '2 hours'` })
      .where(eq(tableSessions.id, phone.tableSessionId));
    await rawDb().execute(sql`select public.close_idle_table_sessions()`);
    await expect(request(phone.clientSessionId, 'idem-key-0004')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
    // A new scan opens a fresh table session.
    const next = await openClientSession(ctx.tokens[3] ?? '', DEVICE_A);
    expect(next.tableSessionId).not.toBe(phone.tableSessionId);
  });

  it('never lets a cookie of one restaurant act on another', async () => {
    const phone = await openClientSession(ctx.tokens[0] ?? '', DEVICE_A);
    await expect(
      createServiceRequest({
        restaurantId: '00000000-0000-4000-8000-000000000000',
        clientSessionId: phone.clientSessionId,
        kind: 'waiter',
        paymentMethod: null,
        idempotencyKey: 'idem-key-0005',
        cooldownSeconds: 60,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('records feedback within limits, views and availability', async () => {
    const phone = await openClientSession(ctx.tokens[0] ?? '', DEVICE_B);
    const feedback = (rating: number) =>
      createFeedback({
        restaurantId: ctx.restaurantId,
        clientSessionId: phone.clientSessionId,
        rating,
        comment: null,
        maxPerSession: 1,
      });
    await feedback(5);
    await expect(feedback(4)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await recordMenuView({ slug: SLUG });
    await recordMenuView({ token: ctx.tokens[0] ?? '' });
    await recordMenuView({ slug: 'no-such-venue' });
    const views = await rawDb().execute<{ count: number }>(
      sql`select count(*)::int as count from public.menu_views where restaurant_id = ${ctx.restaurantId}`,
    );
    expect(views[0]?.count).toBe(2);
    expect(await menuAvailability(SLUG)).toEqual({ products: [], options: [] });
    expect(await menuAvailability('no-such-venue')).toBeNull();
    const devices = await rawDb()
      .select({ id: clientSessions.id })
      .from(clientSessions)
      .where(eq(clientSessions.deviceId, DEVICE_B));
    expect(devices.length).toBeGreaterThan(0);
  });
});

describe('realtime (P1-09, ADR-0008)', () => {
  it('a new request reaches a subscribed staff client', async () => {
    const { apiUrl, publishableKey } = localSupabase();
    const staff = createClient(apiUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clients.push(staff);
    const { data, error } = await staff.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (error) throw error;
    await staff.realtime.setAuth(data.session.access_token);

    const topic = `r:${ctx.restaurantId}:requests`;
    const received: unknown[] = [];
    const warm: unknown[] = [];
    const channel = staff.channel(topic, { config: { private: true } });
    channel.on('broadcast', { event: 'request.created' }, (message) =>
      received.push(message.payload),
    );
    channel.on('broadcast', { event: 'warm.up' }, (message) => warm.push(message.payload));
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === STATE.SUBSCRIBED) resolve();
        else if (status === STATE.CHANNEL_ERROR || status === STATE.TIMED_OUT) {
          reject(new Error(status));
        }
      });
    });

    // Realtime starts its database listener lazily on the first join: publish until it flows.
    const deadline = Date.now() + 30_000;
    while (warm.length === 0 && Date.now() < deadline) {
      await rawDb().execute(sql`select public.broadcast(${topic}, 'warm.up', '{}'::jsonb)`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(warm.length).toBeGreaterThan(0);

    const phone = await openClientSession(ctx.tokens[1] ?? '', DEVICE_A);
    const created = await request(phone.clientSessionId, 'idem-key-realtime', 'bill');
    await expect
      .poll(() => received, { timeout: 10_000 })
      .toContainEqual(expect.objectContaining({ id: created.id, kind: 'bill', table_number: 2 }));
  });
});
