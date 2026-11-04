import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import {
  appearanceSchema,
  linksSchema,
  serviceSettingsSchema,
  venueInfoSchema,
} from '../schemas/settings';
import {
  loadVenueSettings,
  saveAppearance,
  saveLanguages,
  saveLinks,
  saveManualStatus,
  saveServiceSettings,
  saveVenueInfo,
  type SettingsScope,
} from './mutations';

/** Venue settings under the owner's RLS (P1-14); another tenant cannot write. Local Supabase. */

const EMAIL = { a: 'settings-a@example.org', b: 'settings-b@example.org' } as const;
const ids = { a: '', b: '', userA: '', userB: '' };

const scope = (user: string, restaurant: string): SettingsScope => ({
  claims: {
    sub: user,
    role: 'authenticated',
    aal: 'aal1',
    platform_role: 'none',
    memberships: [{ restaurant_id: restaurant, role: 'owner' }],
  },
  restaurantId: restaurant,
});

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug in ('settings-a', 'settings-b') returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(sql`delete from auth.users where email in (${EMAIL.a}, ${EMAIL.b})`);
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
      venueName: `Settings ${key}`,
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [`settings-${key}`],
    });
    ids[key] = venue.restaurantId;
    ids[key === 'a' ? 'userA' : 'userB'] = data.user.id;
  }
}, 60_000);

afterAll(cleanup);

describe('venue settings (P1-14)', () => {
  it('saves every section and reads it back with defaults for the rest', async () => {
    const owner = scope(ids.userA, ids.a);
    await saveVenueInfo(
      owner,
      venueInfoSchema.parse({ name: 'Café Réglé', type: 'tea_room', address: '12 rue de Rome' }),
    );
    await saveLanguages(owner, { locales: ['fr', 'ar'], defaultLocale: 'ar' });
    await saveAppearance(
      owner,
      appearanceSchema.parse({ brandColor: '#2F7D4F', colorMode: 'dark' }),
    );
    await saveLinks(
      owner,
      linksSchema.parse({
        wifiName: 'Cafe',
        wifiPassword: 'menta',
        googleReviewUrl: 'https://g.page/r/x/review',
        instagramUrl: '',
        facebookUrl: '',
        tiktokUrl: '',
      }),
    );
    await saveServiceSettings(
      owner,
      serviceSettingsSchema.parse({
        sessionTimeoutMinutes: 120,
        dayCutoff: '04:30',
        roundingStep: 500,
      }),
    );
    await saveManualStatus(owner, { status: 'closed', hours: 2 });

    const venue = await loadVenueSettings(owner);
    expect(venue).toMatchObject({
      name: 'Café Réglé',
      type: 'tea_room',
      locales: ['fr', 'ar'],
      defaultLocale: 'ar',
      manualStatus: 'closed',
      dayCutoff: '04:30',
      theme: { brand_color: '#2f7d4f', color_mode: 'dark' },
      settings: {
        address: '12 rue de Rome',
        wifi_name: 'Cafe',
        wifi_password: 'menta',
        google_review_url: 'https://g.page/r/x/review',
        instagram_url: null,
        session_timeout_minutes: 120,
        rounding_step: 500,
      },
    });
    expect(venue?.manualStatusUntil).not.toBeNull();
    // The idle-session job reads the same key (P1-09).
    const [row] = await rawDb().execute<{ timeout: string }>(
      sql`select settings ->> 'session_timeout_minutes' as timeout from public.restaurants where id = ${ids.a}`,
    );
    expect(row?.timeout).toBe('120');
  });

  it('refuses writes to another tenant', async () => {
    await expect(
      // B's real claims (owner of B) pointed at A's id.
      saveVenueInfo(
        { ...scope(ids.userB, ids.b), restaurantId: ids.a },
        venueInfoSchema.parse({ name: 'Pirate', type: 'cafe', address: '' }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('validates links and languages', () => {
    expect(
      linksSchema.safeParse({
        wifiName: '',
        wifiPassword: '',
        googleReviewUrl: 'http://not-secure.example',
        instagramUrl: '',
        facebookUrl: '',
        tiktokUrl: '',
      }).success,
    ).toBe(false);
  });
});
