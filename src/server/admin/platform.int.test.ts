import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { aiQuotaState, logAiUsage } from './ai-usage';
import { createVenue } from './onboarding';
import {
  assignPlan,
  listVenues,
  removeOverride,
  requirePlatform,
  setOverride,
  venueDetail,
} from './platform';

/** Super Admin console (P1-15): role + aal2 checks, audited writes, AI override. */

const EMAIL = 'platform-venue-owner@example.org';
const SLUG = 'platform-cafe';
const ids = { owner: '', restaurant: '' };
const ADMIN_ID = '00000000-0000-4000-8000-00000000ad01';

const claims = (overrides: Partial<SessionClaims>): SessionClaims => ({
  sub: ADMIN_ID,
  role: 'authenticated',
  aal: 'aal2',
  platform_role: 'super_admin',
  memberships: [],
  ...overrides,
});

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(sql`delete from auth.users where email = ${EMAIL} or id = ${ADMIN_ID}`);
}

beforeAll(async () => {
  await cleanup();
  await rawDb().execute(
    sql`insert into auth.users (id, email) values (${ADMIN_ID}, 'platform-admin@example.org')`,
  );
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: 'correct-horse-battery-staple',
    email_confirm: true,
  });
  if (error) throw error;
  const venue = await createVenue({
    ownerId: data.user.id,
    venueName: 'Platform Café',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  Object.assign(ids, { owner: data.user.id, restaurant: venue.restaurantId });
}, 60_000);

afterAll(cleanup);

describe('platform console (P1-15)', () => {
  it('requires a platform role, aal2, and super_admin for writes', () => {
    expect(() => requirePlatform(null)).toThrow();
    expect(() => requirePlatform(claims({ platform_role: 'none' }))).toThrow();
    expect(() => requirePlatform(claims({ aal: 'aal1' }))).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN', details: { reason: 'aal2' } }),
    );
    expect(() => requirePlatform(claims({ platform_role: 'support' }))).not.toThrow();
    expect(() => requirePlatform(claims({ platform_role: 'support' }), true)).toThrow();
  });

  it('lists and searches venues', async () => {
    const found = await listVenues(claims({}), 'platform');
    expect(found).toContainEqual(
      expect.objectContaining({ id: ids.restaurant, slug: SLUG, plan: 'basic', members: 1 }),
    );
    await expect(listVenues(claims({ aal: 'aal1' }), '')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('an ai_unlimited override lifts AI quotas; every write is audited', async () => {
    for (let index = 0; index < 3; index += 1) {
      await logAiUsage({
        restaurantId: ids.restaurant,
        actorId: ids.owner,
        feature: 'menu_import',
        model: 'gemini-2.5-flash',
        inputTokens: 1000,
        outputTokens: 300,
        costMillimes: 4,
        units: 1,
      });
    }
    expect((await aiQuotaState(ids.restaurant)).limits.photoImports).toBe(3);

    await setOverride(claims({}), {
      restaurantId: ids.restaurant,
      key: 'ai_unlimited',
      enabled: true,
      expiresAt: new Date(Date.now() + 86_400_000),
      reason: 'Pilot onboarding',
    });
    expect((await aiQuotaState(ids.restaurant)).limits.photoImports).toBe(1000);

    await assignPlan(claims({}), ids.restaurant, 'pro');
    const detail = await venueDetail(claims({}), ids.restaurant);
    expect(detail?.plan).toBe('pro');
    expect(detail?.audit.map((row) => row.action)).toEqual(
      expect.arrayContaining(['platform.flag_override', 'platform.plan_assign']),
    );
    const override = detail?.overrides.find((row) => row.key === 'ai_unlimited');
    if (!override) throw new Error('override expected');

    await removeOverride(claims({}), ids.restaurant, override.id);
    expect((await aiQuotaState(ids.restaurant)).limits.photoImports).toBe(10);
    await expect(
      setOverride(claims({ platform_role: 'support' }), {
        restaurantId: ids.restaurant,
        key: 'ai_unlimited',
        enabled: true,
        expiresAt: null,
        reason: 'Support cannot',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
