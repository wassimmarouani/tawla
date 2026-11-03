import { createClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { devicePairingCodes, staffSessions } from '@/lib/db/schema/schema';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { createVenue } from './onboarding';
import {
  acceptInvitations,
  activeStaffSession,
  claimPairingCode,
  createPairingCode,
  deviceForToken,
  inviteStaff,
  loadTeam,
  revokeDevice,
  startStaffSession,
} from './staff-access';

/** Device pairing, staff sessions and invitations (P1-11, ADR-0010). Local Supabase. */

const OWNER = 'staff-access-owner@example.org';
const INVITED = 'staff-access-waiter@example.org';
const SECOND = 'staff-access-second@example.org';
const PASSWORD = 'correct-horse-battery-staple';
const SLUG = 'staff-access-cafe';
const ctx = { restaurantId: '', ownerId: '' };

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(
    sql`delete from auth.users where email in (${OWNER}, ${INVITED}, ${SECOND})`,
  );
}

beforeAll(async () => {
  await cleanup();
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: OWNER,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  ctx.ownerId = data.user.id;
  const venue = await createVenue({
    ownerId: data.user.id,
    venueName: 'Staff access',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  ctx.restaurantId = venue.restaurantId;
}, 60_000);

afterAll(cleanup);

describe('device pairing (P1-11)', () => {
  it('turns a code into a device once; the token identifies it until revoked', async () => {
    const { code } = await createPairingCode({
      restaurantId: ctx.restaurantId,
      actorId: ctx.ownerId,
      label: 'Comptoir',
      mode: 'fixed',
    });
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    const typed = `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`;
    const paired = await claimPairingCode(typed);
    expect(paired.restaurantId).toBe(ctx.restaurantId);
    await expect(claimPairingCode(code)).rejects.toMatchObject({ code: 'PAIRING_CODE_INVALID' });

    const device = await deviceForToken(paired.token);
    expect(device).toMatchObject({ label: 'Comptoir', mode: 'fixed', restaurantSlug: SLUG });
    expect(await deviceForToken('x'.repeat(43))).toBeNull();

    // A staff session on the device, ended by the revocation.
    if (!device) throw new Error('device expected');
    const session = await startStaffSession({ device, userId: ctx.ownerId, authSessionId: null });
    expect(session?.role).toBe('owner');
    expect(await activeStaffSession({ deviceId: device.id, userId: ctx.ownerId })).not.toBeNull();
    await revokeDevice({
      restaurantId: ctx.restaurantId,
      deviceId: device.id,
      actorId: ctx.ownerId,
    });
    expect(await deviceForToken(paired.token)).toBeNull();
    expect(await activeStaffSession({ deviceId: device.id, userId: ctx.ownerId })).toBeNull();
    const [ended] = await rawDb()
      .select({ endedAt: staffSessions.endedAt })
      .from(staffSessions)
      .where(eq(staffSessions.deviceId, device.id));
    expect(ended?.endedAt).not.toBeNull();
  });

  it('refuses expired codes and people from other venues', async () => {
    const { code } = await createPairingCode({
      restaurantId: ctx.restaurantId,
      actorId: ctx.ownerId,
      label: 'Téléphone',
      mode: 'mobile',
    });
    await rawDb()
      .update(devicePairingCodes)
      .set({
        createdAt: sql`now() - interval '11 minutes'`,
        expiresAt: sql`now() - interval '1 minute'`,
      })
      .where(eq(devicePairingCodes.restaurantId, ctx.restaurantId));
    await expect(claimPairingCode(code)).rejects.toMatchObject({
      code: 'PAIRING_CODE_INVALID',
      details: { reason: 'expired' },
    });

    const fresh = await createPairingCode({
      restaurantId: ctx.restaurantId,
      actorId: ctx.ownerId,
      label: 'Téléphone',
      mode: 'mobile',
    });
    const paired = await claimPairingCode(fresh.code);
    const device = await deviceForToken(paired.token);
    if (!device) throw new Error('device expected');
    const stranger = '00000000-0000-4000-8000-00000000dead';
    expect(await startStaffSession({ device, userId: stranger, authSessionId: null })).toBeNull();
  });
});

describe('staff invitations (P1-11)', () => {
  it('invites one member on Basic, then refuses with PLAN_LIMIT_REACHED', async () => {
    await inviteStaff({
      restaurantId: ctx.restaurantId,
      actorId: ctx.ownerId,
      email: INVITED,
      role: 'waiter',
      locale: 'fr',
    });
    await expect(
      inviteStaff({
        restaurantId: ctx.restaurantId,
        actorId: ctx.ownerId,
        email: SECOND,
        role: 'counter',
        locale: 'fr',
      }),
    ).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });

    const team = await loadTeam(ctx.restaurantId);
    expect(team.invitations).toEqual([expect.objectContaining({ email: INVITED, role: 'waiter' })]);
    expect(team.seats).toEqual({ limit: 1, left: 0 });
  });

  it('turns the invitation into a membership when the link is used', async () => {
    const [user] = await rawDb().execute<{ id: string }>(
      sql`select id from auth.users where email = ${INVITED}`,
    );
    if (!user) throw new Error('invited user expected');
    expect(await acceptInvitations({ userId: user.id, email: INVITED })).toEqual(['waiter']);
    expect(await acceptInvitations({ userId: user.id, email: INVITED })).toEqual([]);
    const team = await loadTeam(ctx.restaurantId);
    expect(team.members).toContainEqual(
      expect.objectContaining({ email: INVITED, role: 'waiter', isActive: true }),
    );
    expect(team.invitations).toEqual([]);
    expect(team.seats.left).toBe(0);
  });
});
