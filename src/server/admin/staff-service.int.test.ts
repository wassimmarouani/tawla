import { createClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import {
  notificationIncidents,
  serviceRequests,
  tableSessions,
  tables,
} from '@/lib/db/schema/schema';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { createVenue } from './onboarding';
import {
  claimRequest,
  completeRequest,
  escalateRequests,
  listLiveRequests,
  recordAcks,
} from './staff-service';
import { createServiceRequest, openClientSession } from './table-service';

/** Staff side of service requests (P1-12, ADR-0007). Local Supabase. */

const EMAIL = 'staff-service-owner@example.org';
const SLUG = 'staff-service-cafe';
const ctx = { restaurantId: '', ownerId: '', tokens: [] as string[] };

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(sql`delete from auth.users where email = ${EMAIL}`);
}

beforeAll(async () => {
  await cleanup();
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: 'correct-horse-battery-staple',
    email_confirm: true,
  });
  if (error) throw error;
  ctx.ownerId = data.user.id;
  const venue = await createVenue({
    ownerId: data.user.id,
    venueName: 'Staff service',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  ctx.restaurantId = venue.restaurantId;
  const rows = await rawDb()
    .insert(tables)
    .values([7, 8, 9].map((number) => ({ restaurantId: venue.restaurantId, number })))
    .returning({ token: tables.token });
  ctx.tokens = rows.map((row) => row.token);
}, 60_000);

afterAll(cleanup);

async function call(tokenIndex: number, kind: 'waiter' | 'bill', key: string) {
  const token = ctx.tokens[tokenIndex] ?? '';
  const phone = await openClientSession(token, `staffServicePhone${String(tokenIndex)}xx`);
  const created = await createServiceRequest({
    restaurantId: ctx.restaurantId,
    clientSessionId: phone.clientSessionId,
    tableToken: token,
    kind,
    paymentMethod: kind === 'bill' ? 'card' : null,
    idempotencyKey: key,
    cooldownSeconds: 60,
  });
  return { ...created, tableSessionId: phone.tableSessionId };
}

describe('staff service requests (P1-12)', () => {
  it('lists live requests with table numbers; only one claim wins', async () => {
    const created = await call(0, 'waiter', 'staff-key-0001');
    const live = await listLiveRequests(ctx.restaurantId);
    expect(live).toContainEqual(
      expect.objectContaining({ id: created.id, kind: 'waiter', tableNumber: 7, status: 'open' }),
    );

    const results = await Promise.allSettled([
      claimRequest({ restaurantId: ctx.restaurantId, requestId: created.id, userId: ctx.ownerId }),
      claimRequest({ restaurantId: ctx.restaurantId, requestId: created.id, userId: ctx.ownerId }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({
      code: 'ORDER_STATE_CONFLICT',
      details: { reason: 'alreadyClaimed' },
    });
    await expect(
      claimRequest({
        restaurantId: '00000000-0000-4000-8000-000000000000',
        requestId: created.id,
        userId: ctx.ownerId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('closes the table session when the bill request is done', async () => {
    const bill = await call(1, 'bill', 'staff-key-0002');
    await completeRequest({
      restaurantId: ctx.restaurantId,
      requestId: bill.id,
      userId: ctx.ownerId,
    });
    const [session] = await rawDb()
      .select({ status: tableSessions.status })
      .from(tableSessions)
      .where(eq(tableSessions.id, bill.tableSessionId));
    expect(session?.status).toBe('closed');
    await expect(
      completeRequest({ restaurantId: ctx.restaurantId, requestId: bill.id, userId: ctx.ownerId }),
    ).rejects.toMatchObject({ code: 'ORDER_STATE_CONFLICT', details: { reason: 'alreadyDone' } });
  });

  it('records acks once and ignores foreign ids; escalates unanswered requests once', async () => {
    const created = await call(2, 'waiter', 'staff-key-0003');
    const ack = () =>
      recordAcks({
        restaurantId: ctx.restaurantId,
        userId: ctx.ownerId,
        deviceId: 'staffServiceDevice01',
        eventIds: [created.id, '00000000-0000-4000-8000-00000000f00d'],
      });
    expect(await ack()).toBe(1);
    expect(await ack()).toBe(0);

    // Three minutes old and never acknowledged by anyone else: unclaimed (acked, so no no_ack).
    await rawDb()
      .update(serviceRequests)
      .set({ createdAt: sql`now() - interval '3 minutes'` })
      .where(eq(serviceRequests.id, created.id));
    await escalateRequests();
    await escalateRequests();
    const incidents = await rawDb()
      .select({ kind: notificationIncidents.kind })
      .from(notificationIncidents)
      .where(eq(notificationIncidents.eventId, created.id));
    expect(incidents).toEqual([{ kind: 'unclaimed' }]);
  });
});
