import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from './client';
import { withRls, type RlsClaims } from './rls';
import { memberships, restaurants } from './schema/schema';

/**
 * Proves ADR-0003 end to end: queries through withRls() are filtered by Postgres RLS, and the
 * claims/role never leak to the next transaction on a pooled connection.
 * Requires local Supabase: pnpm db:start && pnpm test:integration
 */

const ID = {
  orgA: '11000000-0000-4000-8000-00000000000a',
  orgB: '11000000-0000-4000-8000-00000000000b',
  restaurantA: '21000000-0000-4000-8000-00000000000a',
  restaurantB: '21000000-0000-4000-8000-00000000000b',
  managerA: '01000000-0000-4000-8000-0000000000a2',
  managerB: '01000000-0000-4000-8000-0000000000b2',
} as const;

const managerA: RlsClaims = {
  role: 'authenticated',
  sub: ID.managerA,
  memberships: [{ restaurant_id: ID.restaurantA, role: 'manager' }],
};
const managerB: RlsClaims = {
  role: 'authenticated',
  sub: ID.managerB,
  memberships: [{ restaurant_id: ID.restaurantB, role: 'manager' }],
};

/** Postgres error code of a rejected query (Drizzle wraps the driver error in `cause`). */
async function pgErrorCode(query: Promise<unknown>): Promise<string | undefined> {
  try {
    await query;
    return undefined;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code;
  }
}

async function cleanup() {
  const db = rawDb();
  await db.execute(
    sql`delete from public.restaurants where id in (${ID.restaurantA}, ${ID.restaurantB})`,
  );
  await db.execute(sql`delete from public.organizations where id in (${ID.orgA}, ${ID.orgB})`);
  await db.execute(sql`delete from auth.users where id in (${ID.managerA}, ${ID.managerB})`);
}

beforeAll(async () => {
  await cleanup();
  const db = rawDb();
  await db.execute(sql`
    insert into auth.users (id, email) values
      (${ID.managerA}, 'int-manager-a@example.org'), (${ID.managerB}, 'int-manager-b@example.org')
  `);
  await db.execute(sql`
    insert into public.organizations (id, name) values (${ID.orgA}, 'Int A'), (${ID.orgB}, 'Int B')
  `);
  await db.execute(sql`
    insert into public.restaurants (id, organization_id, slug, name) values
      (${ID.restaurantA}, ${ID.orgA}, 'int-cafe-a', 'Int Café A'),
      (${ID.restaurantB}, ${ID.orgB}, 'int-cafe-b', 'Int Café B')
  `);
  await db.execute(sql`
    insert into public.memberships (restaurant_id, user_id, role) values
      (${ID.restaurantA}, ${ID.managerA}, 'manager'), (${ID.restaurantB}, ${ID.managerB}, 'manager')
  `);
});

afterAll(cleanup);

describe('withRls', () => {
  it('returns only the rows of the caller’s restaurant, with typed queries', async () => {
    const rows = await withRls(managerA, (tx) =>
      tx.select({ slug: restaurants.slug }).from(restaurants),
    );
    expect(rows).toEqual([{ slug: 'int-cafe-a' }]);
  });

  it('isolates concurrent transactions of different tenants', async () => {
    const [a, b] = await Promise.all([
      withRls(managerA, (tx) => tx.select({ slug: restaurants.slug }).from(restaurants)),
      withRls(managerB, (tx) => tx.select({ slug: restaurants.slug }).from(restaurants)),
    ]);
    expect(a).toEqual([{ slug: 'int-cafe-a' }]);
    expect(b).toEqual([{ slug: 'int-cafe-b' }]);
  });

  it('cannot write into another tenant', async () => {
    const updated = await withRls(managerA, (tx) =>
      tx
        .update(restaurants)
        .set({ name: 'Hacked' })
        .where(sql`${restaurants.id} = ${ID.restaurantB}`)
        .returning({ id: restaurants.id }),
    );
    expect(updated).toEqual([]);
  });

  it('denies column-level privileges such as pin_hmac', async () => {
    const code = await pgErrorCode(
      withRls(managerA, (tx) => tx.select({ pin: memberships.pinHmac }).from(memberships)),
    );
    expect(code).toBe('42501'); // insufficient_privilege
  });

  it('gives anon no access to tenant tables', async () => {
    const code = await pgErrorCode(
      withRls({ role: 'anon' }, (tx) => tx.select().from(restaurants)),
    );
    expect(code).toBe('42501');
  });

  it('never leaks the role or claims to the next transaction on the pool', async () => {
    await withRls(managerA, (tx) => tx.select().from(restaurants));
    const [state] = await rawDb().execute<{ role: string; claims: string | null }>(sql`
      select current_user as role, current_setting('request.jwt.claims', true) as claims
    `);
    expect(state?.role).toBe('postgres');
    expect(state?.claims ?? '').toBe('');
  });
});
