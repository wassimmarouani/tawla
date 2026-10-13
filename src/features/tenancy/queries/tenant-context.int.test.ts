import { createClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { withRls } from '@/lib/db/rls';
import { featureOverrides, restaurants } from '@/lib/db/schema/schema';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { loadTenantContext } from './tenant-context';

/** Tenant isolation of the back-office context (P0-11). Requires local Supabase. */

const EMAIL = { a: 'tenant-ctx-a@example.org', b: 'tenant-ctx-b@example.org' } as const;
const NOW = new Date('2026-10-13T10:00:00Z');
const ids = { userA: '', userB: '', restaurantA: '', restaurantB: '' };

function claimsFor(userId: string, memberships: SessionClaims['memberships']): SessionClaims {
  return {
    sub: userId,
    role: 'authenticated',
    aal: 'aal1',
    platform_role: 'none',
    memberships,
  };
}

async function cleanup() {
  const db = rawDb();
  await db.execute(sql`
    with gone as (
      delete from public.restaurants where id in (
        select m.restaurant_id from public.memberships m join auth.users u on u.id = m.user_id
        where u.email in (${EMAIL.a}, ${EMAIL.b}))
      returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await db.execute(sql`delete from auth.users where email in (${EMAIL.a}, ${EMAIL.b})`);
}

beforeAll(async () => {
  await cleanup();
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  for (const key of ['a', 'b'] as const) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL[key],
      password: 'correct-horse-battery-staple',
      email_confirm: true,
    });
    if (error) throw error;
    const venue = await createVenue({
      ownerId: data.user.id,
      venueName: `Tenant ${key.toUpperCase()}`,
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [`tenant-ctx-${key}`],
    });
    if (key === 'a') Object.assign(ids, { userA: data.user.id, restaurantA: venue.restaurantId });
    else Object.assign(ids, { userB: data.user.id, restaurantB: venue.restaurantId });
  }
}, 60_000);

afterAll(cleanup);

describe('loadTenantContext (P0-11)', () => {
  it('loads the owner’s restaurant with Basic flags', async () => {
    const claims = claimsFor(ids.userA, [{ restaurant_id: ids.restaurantA, role: 'owner' }]);
    const result = await loadTenantContext(claims, null, NOW);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.context).toMatchObject({
      userId: ids.userA,
      role: 'owner',
      restaurant: { id: ids.restaurantA, name: 'Tenant A', slug: 'tenant-ctx-a', status: 'active' },
      planCode: 'basic',
    });
    expect(result.context.restaurants).toHaveLength(1);
    expect(result.context.flags.menu).toBe(true);
    expect(result.context.flags.ordering).toBe(false);
  });

  it('applies a Super Admin override and a restaurant switch-off', async () => {
    const db = rawDb();
    await db.insert(featureOverrides).values([
      { restaurantId: ids.restaurantA, featureKey: 'ordering', enabled: true },
      {
        restaurantId: ids.restaurantA,
        featureKey: 'printing',
        enabled: true,
        expiresAt: '2026-10-01T00:00:00Z',
      },
    ]);
    await db
      .update(restaurants)
      .set({ settings: { features: { ai_import: false } } })
      .where(eq(restaurants.id, ids.restaurantA));

    const claims = claimsFor(ids.userA, [{ restaurant_id: ids.restaurantA, role: 'owner' }]);
    const result = await loadTenantContext(claims, null, NOW);
    expect(result.kind === 'ok' && result.context.flags).toMatchObject({
      ordering: true,
      printing: false,
      ai_import: false,
      ai_translate: true,
    });
  });

  it('forbids restaurant B to a user of restaurant A (context and RLS)', async () => {
    const claims = claimsFor(ids.userA, [{ restaurant_id: ids.restaurantA, role: 'owner' }]);
    expect(await loadTenantContext(claims, ids.restaurantB, NOW)).toEqual({ kind: 'forbidden' });

    const visible = await withRls(claims, (tx) =>
      tx
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.id, ids.restaurantB)),
    );
    expect(visible).toEqual([]);
  });

  it('forbids floor roles and reports users without a restaurant', async () => {
    const waiter = claimsFor(ids.userA, [{ restaurant_id: ids.restaurantA, role: 'waiter' }]);
    expect(await loadTenantContext(waiter, null, NOW)).toEqual({ kind: 'forbidden' });
    expect(await loadTenantContext(claimsFor(ids.userA, []), null, NOW)).toEqual({
      kind: 'no-restaurant',
    });
  });

  it('treats a stale membership claim as forbidden when RLS hides the row', async () => {
    const stale = claimsFor(ids.userA, [
      { restaurant_id: '00000000-0000-4000-8000-0000000000ff', role: 'owner' },
    ]);
    expect(await loadTenantContext(stale, null, NOW)).toEqual({ kind: 'forbidden' });
  });
});
