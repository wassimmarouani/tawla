import { readFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import {
  DEMO_MENU_FILE,
  DEMO_VENUE,
  demoVenueState,
  insertDemoVenue,
  installDemoVenue,
  splitStatements,
} from './demo-venue';

/** Demo venue installer (marketing demo in hosted environments). */

const OWNER = 'd0000000-0000-4000-8000-000000000001';

class Rollback extends Error {}

const claims = (overrides: Partial<SessionClaims>): SessionClaims => ({
  sub: OWNER,
  role: 'authenticated',
  aal: 'aal2',
  platform_role: 'super_admin',
  memberships: [],
  ...overrides,
});

async function menu() {
  return splitStatements(await readFile(DEMO_MENU_FILE, 'utf8'));
}

describe('demo venue', () => {
  it('reads the shared menu file as one statement per insert', async () => {
    const statements = await menu();
    expect(statements).toHaveLength(5);
    for (const statement of statements) expect(statement).toMatch(/^insert into public\./);
  });

  it('is partial locally (only Café El Bahja seeded, Pizzeria and Pâtisserie demos missing)', async () => {
    await expect(demoVenueState()).resolves.toBe('partial');
    const statements = await menu();
    // Re-running on El Bahja alone never duplicates it.
    await expect(rawDb().transaction((tx) => insertDemoVenue(tx, OWNER, statements))).resolves.toBe(
      false,
    );
  });

  it('creates the venue, menu, tables, owner, plan and audit entry on an empty platform', async () => {
    const statements = await menu();
    let counts: Record<string, unknown> | undefined;
    await expect(
      rawDb().transaction(async (tx) => {
        await tx.execute(sql`
          with gone as (
            delete from public.restaurants where id = ${DEMO_VENUE.restaurantId}
            returning organization_id)
          delete from public.organizations where id in (select organization_id from gone)`);
        await expect(insertDemoVenue(tx, OWNER, statements)).resolves.toBe(true);
        const [row] = await tx.execute(sql`
          select
            (select slug from public.restaurants where id = ${DEMO_VENUE.restaurantId}) as slug,
            (select count(*)::int from public.categories where restaurant_id = ${DEMO_VENUE.restaurantId}) as categories,
            (select count(*)::int from public.products where restaurant_id = ${DEMO_VENUE.restaurantId}) as products,
            (select count(*)::int from public.tables where restaurant_id = ${DEMO_VENUE.restaurantId} and token is not null) as tables,
            (select role::text from public.memberships where restaurant_id = ${DEMO_VENUE.restaurantId} and user_id = ${OWNER}) as role,
            (select p.code from public.subscriptions s join public.plans p on p.id = s.plan_id where s.restaurant_id = ${DEMO_VENUE.restaurantId}) as plan,
            (select count(*)::int from public.audit_logs where restaurant_id = ${DEMO_VENUE.restaurantId} and action = 'platform.demo_install') as audits`);
        counts = row;
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
    expect(counts).toEqual({
      slug: DEMO_VENUE.slug,
      categories: 9,
      products: 43,
      tables: DEMO_VENUE.tables,
      role: 'owner',
      plan: 'basic',
      audits: 1,
    });
  });

  it('creates the missing demo venues (Pizzeria, Pâtisserie, Bar, Street, Glacier…) on install', async () => {
    const result = await installDemoVenue(claims({}), localSupabase());
    expect(result.created).toBeGreaterThanOrEqual(2);
    await expect(demoVenueState()).resolves.toBe('ready');
    // Clean up so the next run (and the demo-login test) finds the same local state as seeded:
    // every demo venue id except Café El Bahja + its memberships + its organisations.
    await rawDb().execute(sql`
      with gone as (
        delete from public.restaurants where id in (
          'b0000000-0000-4000-8000-000000000003',
          'b0000000-0000-4000-8000-000000000004',
          'b0000000-0000-4000-8000-000000000011',
          'b0000000-0000-4000-8000-000000000012',
          'b0000000-0000-4000-8000-000000000013',
          'b0000000-0000-4000-8000-000000000014',
          'b0000000-0000-4000-8000-000000000015',
          'b0000000-0000-4000-8000-000000000016',
          'b0000000-0000-4000-8000-000000000017')
        returning organization_id)
      delete from public.organizations where id in (select organization_id from gone)`);
  });

  it('is reserved to Super Admins with two-factor authentication', async () => {
    const storage = { apiUrl: 'http://unused.invalid', secretKey: 'sb_secret_unused' };
    await expect(installDemoVenue(claims({ platform_role: 'support' }), storage)).rejects.toThrow(
      'Super Admin only',
    );
    await expect(installDemoVenue(claims({ aal: 'aal1' }), storage)).rejects.toThrow(
      'Two-factor authentication required',
    );
    await expect(installDemoVenue(null, storage)).rejects.toThrow('Platform role required');
  });
});
