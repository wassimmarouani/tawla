import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { OnboardingError, createVenue } from './onboarding';

/** Requires local Supabase (pnpm db:start). */

const EMAIL = {
  owner: 'onboarding-owner@example.org',
  second: 'onboarding-second@example.org',
  unconfirmed: 'onboarding-unconfirmed@example.org',
} as const;
const SLUG = 'onboarding-spec-cafe';
const users: Record<keyof typeof EMAIL, string> = { owner: '', second: '', unconfirmed: '' };

async function cleanup() {
  const db = rawDb();
  const emails = Object.values(EMAIL);
  const owned = sql`select m.restaurant_id from public.memberships m join auth.users u on u.id = m.user_id
    where u.email in (${sql.join(
      emails.map((email) => sql`${email}`),
      sql`, `,
    )})`;
  await db.execute(sql`
    with gone as (delete from public.restaurants where id in (${owned}) returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await db.execute(
    sql`delete from auth.users where email in (${sql.join(
      emails.map((email) => sql`${email}`),
      sql`, `,
    )})`,
  );
}

beforeAll(async () => {
  await cleanup();
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  for (const key of Object.keys(EMAIL) as (keyof typeof EMAIL)[]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL[key],
      password: 'correct-horse-battery-staple',
      email_confirm: key !== 'unconfirmed',
    });
    if (error) throw error;
    users[key] = data.user.id;
  }
}, 60_000);

afterAll(cleanup);

describe('createVenue (P0-11)', () => {
  it('creates organization, restaurant, owner membership, Basic subscription and audit entry', async () => {
    const result = await createVenue({
      ownerId: users.owner,
      venueName: '  Onboarding Spec Café ',
      venueType: 'tea_room',
      locale: 'ar',
      slugCandidates: [SLUG, `${SLUG}-k3x9`],
    });
    expect(result).toMatchObject({ slug: SLUG, created: true });

    const [row] = await rawDb().execute(sql`
      select r.name, r.type::text, r.default_locale, o.name as organization, m.role::text,
             p.code as plan, s.status::text as subscription,
             (select count(*)::int from public.audit_logs a
               where a.entity_id = r.id::text and a.action = 'restaurant.create'
                 and a.actor_id = m.user_id) as audits
      from public.restaurants r
      join public.organizations o on o.id = r.organization_id
      join public.memberships m on m.restaurant_id = r.id
      join public.subscriptions s on s.restaurant_id = r.id
      join public.plans p on p.id = s.plan_id
      where r.id = ${result.restaurantId}
    `);
    expect(row).toEqual({
      name: 'Onboarding Spec Café',
      type: 'tea_room',
      default_locale: 'ar',
      organization: 'Onboarding Spec Café',
      role: 'owner',
      plan: 'basic',
      subscription: 'active',
      audits: 1,
    });
  });

  it('is idempotent per owner, including concurrent submissions', async () => {
    const input = {
      ownerId: users.owner,
      venueName: 'Another name',
      venueType: 'cafe' as const,
      locale: 'fr' as const,
      slugCandidates: ['onboarding-other-name'],
    };
    const results = await Promise.all([createVenue(input), createVenue(input)]);
    for (const result of results) expect(result).toMatchObject({ slug: SLUG, created: false });
  });

  it('skips a slug that is already taken', async () => {
    const result = await createVenue({
      ownerId: users.second,
      venueName: 'Onboarding Spec Café',
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [SLUG, `${SLUG}-k3x9`],
    });
    expect(result).toMatchObject({ slug: `${SLUG}-k3x9`, created: true });
  });

  it('refuses an unconfirmed email and reserved slugs', async () => {
    await expect(
      createVenue({
        ownerId: users.unconfirmed,
        venueName: 'Ghost',
        venueType: 'cafe',
        locale: 'fr',
        slugCandidates: ['onboarding-ghost'],
      }),
    ).rejects.toEqual(new OnboardingError('EMAIL_NOT_CONFIRMED'));

    await expect(
      createVenue({
        ownerId: users.unconfirmed,
        venueName: 'Ghost',
        venueType: 'cafe',
        locale: 'fr',
        slugCandidates: ['dashboard'],
      }),
    ).rejects.toThrow('reserved slug');
  });
});
