import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { venueFeatureEnabled } from './flags';
import { createVenue } from './onboarding';

/** Effective flags on anonymous surfaces (ADR-0031): plan default, override, venue setting. */

const EMAIL = 'flags-venue-owner@example.org';
const SLUG = 'flags-cafe';
const ids = { restaurant: '' };

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(sql`delete from auth.users where email = ${EMAIL}`);
}

async function usePlan(code: string) {
  await rawDb().execute(sql`
    update public.subscriptions set plan_id = (select id from public.plans where code = ${code})
    where restaurant_id = ${ids.restaurant}`);
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
  const venue = await createVenue({
    ownerId: data.user.id,
    venueName: 'Flags Café',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  ids.restaurant = venue.restaurantId;
}, 60_000);

afterAll(cleanup);

describe('venueFeatureEnabled (ADR-0031)', () => {
  it('follows the plan: Basic has service requests, Menu QR does not', async () => {
    expect(await venueFeatureEnabled({ slug: SLUG }, 'service_requests')).toBe(true);
    await usePlan('menu_qr');
    expect(await venueFeatureEnabled({ slug: SLUG }, 'service_requests')).toBe(false);
    expect(await venueFeatureEnabled({ restaurantId: ids.restaurant }, 'menu')).toBe(true);
  });

  it('applies active overrides and ignores expired ones', async () => {
    await rawDb().execute(sql`
      insert into public.feature_overrides (restaurant_id, feature_key, enabled, expires_at)
      values (${ids.restaurant}, 'service_requests', true, now() - interval '1 day')`);
    expect(await venueFeatureEnabled({ slug: SLUG }, 'service_requests')).toBe(false);
    await rawDb().execute(sql`
      update public.feature_overrides set expires_at = now() + interval '1 day'
      where restaurant_id = ${ids.restaurant}`);
    expect(await venueFeatureEnabled({ slug: SLUG }, 'service_requests')).toBe(true);
  });

  it('lets the venue switch a feature off, and unknown venues get nothing', async () => {
    await usePlan('basic');
    await rawDb().execute(sql`
      update public.restaurants
      set settings = jsonb_set(settings, '{features}', '{"service_requests": false}')
      where id = ${ids.restaurant}`);
    expect(await venueFeatureEnabled({ slug: SLUG }, 'service_requests')).toBe(false);
    expect(await venueFeatureEnabled({ slug: 'no-such-venue' }, 'menu')).toBe(false);
  });
});
