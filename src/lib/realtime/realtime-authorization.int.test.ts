import {
  REALTIME_SUBSCRIBE_STATES as STATE,
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';

/**
 * P0-08 spike, kept as the permanent Realtime authorization suite (ADR-0008):
 * private channels, receive-only clients, database-only publishing, tenant and role isolation.
 * Uses real WebSocket clients against local Supabase (pnpm db:start).
 */

const ID = {
  org: '12000000-0000-4000-8000-000000000001',
  restaurantA: '22000000-0000-4000-8000-00000000000a',
  restaurantB: '22000000-0000-4000-8000-00000000000b',
} as const;
const PUBLIC_ID_A = 'rt-spike-public-id-aaaaaa';
const PASSWORD = 'correct-horse-battery-staple';
const STAFF = {
  waiterA: 'rt-waiter-a@example.org',
  counterA: 'rt-counter-a@example.org',
} as const;

const clients: SupabaseClient[] = [];

function anonClient(): SupabaseClient {
  const { apiUrl, publishableKey } = localSupabase();
  const client = createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  return client;
}

async function staffClient(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  await client.realtime.setAuth(data.session.access_token);
  return client;
}

interface Subscription {
  channel: RealtimeChannel;
  status: STATE;
  received: unknown[];
}

/** Joins a private channel and resolves with its final join status. */
function join(client: SupabaseClient, topic: string): Promise<Subscription> {
  const received: unknown[] = [];
  const channel = client.channel(topic, { config: { private: true } });
  channel.on('broadcast', { event: '*' }, (message) => received.push(message.payload));
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === STATE.CLOSED) return;
      resolve({ channel, status, received });
    });
  });
}

async function publish(topic: string, payload: Record<string, unknown>) {
  await rawDb().execute(
    sql`select realtime.send(${JSON.stringify(payload)}::jsonb, 'test.event', ${topic}, true)`,
  );
}

async function eventually(check: () => boolean, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return check();
}

async function cleanup() {
  const db = rawDb();
  await db.execute(
    sql`delete from public.restaurants where id in (${ID.restaurantA}, ${ID.restaurantB})`,
  );
  await db.execute(sql`delete from public.organizations where id = ${ID.org}`);
  await db.execute(
    sql`delete from auth.users where email in (${STAFF.waiterA}, ${STAFF.counterA})`,
  );
}

beforeAll(async () => {
  await cleanup();
  const db = rawDb();
  await db.execute(sql`insert into public.organizations (id, name) values (${ID.org}, 'RT Org')`);
  await db.execute(sql`
    insert into public.restaurants (id, organization_id, slug, name, public_id) values
      (${ID.restaurantA}, ${ID.org}, 'rt-cafe-a', 'RT Café A', ${PUBLIC_ID_A}),
      (${ID.restaurantB}, ${ID.org}, 'rt-cafe-b', 'RT Café B', 'rt-spike-public-id-bbbbbb')
  `);

  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  for (const [email, role] of [
    [STAFF.waiterA, 'waiter'],
    [STAFF.counterA, 'counter'],
  ] as const) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    await db.execute(sql`
      insert into public.memberships (restaurant_id, user_id, role)
      values (${ID.restaurantA}, ${data.user.id}, ${role})
    `);
  }
}, 60_000);

afterAll(async () => {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
  await cleanup();
});

describe('Realtime authorization (ADR-0008)', () => {
  it('lets an anonymous customer receive the menu topic of an existing restaurant', async () => {
    const customer = await join(anonClient(), `m:${PUBLIC_ID_A}`);
    expect(customer.status).toBe(STATE.SUBSCRIBED);

    await publish(`m:${PUBLIC_ID_A}`, { productId: 'p1', available: false });
    expect(await eventually(() => customer.received.length === 1)).toBe(true);
    // realtime.send adds a message id to the payload.
    expect(customer.received[0]).toMatchObject({ productId: 'p1', available: false });
  });

  it('refuses an anonymous join on an unknown capability id', async () => {
    const attempt = await join(anonClient(), 'm:not-a-real-public-id');
    expect(attempt.status).not.toBe(STATE.SUBSCRIBED);
  });

  it('never delivers a broadcast sent by a client (receive-only, no spoofing)', async () => {
    const listener = await join(anonClient(), `m:${PUBLIC_ID_A}`);
    const attacker = await join(anonClient(), `m:${PUBLIC_ID_A}`);
    expect(attacker.status).toBe(STATE.SUBSCRIBED);

    await attacker.channel.send({
      type: 'broadcast',
      event: 'product.availability_changed',
      payload: { productId: 'p1', available: false, spoofed: true },
    });
    // A real database broadcast sent afterwards proves the listener is live.
    await publish(`m:${PUBLIC_ID_A}`, { productId: 'p2', available: true });
    expect(await eventually(() => listener.received.length >= 1)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(listener.received).toHaveLength(1);
    expect(listener.received[0]).toMatchObject({ productId: 'p2', available: true });
    expect(listener.received[0]).not.toHaveProperty('spoofed');
  });

  it('keeps staff topics closed to anonymous clients', async () => {
    const attempt = await join(anonClient(), `r:${ID.restaurantA}:requests`);
    expect(attempt.status).not.toBe(STATE.SUBSCRIBED);
  });

  it('lets staff receive their restaurant’s requests, but not another restaurant’s', async () => {
    const waiter = await staffClient(STAFF.waiterA);
    const own = await join(waiter, `r:${ID.restaurantA}:requests`);
    expect(own.status).toBe(STATE.SUBSCRIBED);

    await publish(`r:${ID.restaurantA}:requests`, { requestId: 'q1', table: 9 });
    expect(await eventually(() => own.received.length === 1)).toBe(true);

    const other = await join(waiter, `r:${ID.restaurantB}:requests`);
    expect(other.status).not.toBe(STATE.SUBSCRIBED);
  });

  it('restricts the orders topic to counter, manager and owner', async () => {
    const waiter = await staffClient(STAFF.waiterA);
    const counter = await staffClient(STAFF.counterA);
    expect((await join(waiter, `r:${ID.restaurantA}:orders`)).status).not.toBe(STATE.SUBSCRIBED);
    expect((await join(counter, `r:${ID.restaurantA}:orders`)).status).toBe(STATE.SUBSCRIBED);
  });
});
