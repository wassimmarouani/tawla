import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BackofficeScope } from '@/features/backoffice';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { getPublicTable } from '@/features/table-service';
import { loadTables } from '../queries/tables';
import {
  createTables,
  deleteTables,
  deleteZone,
  regenerateToken,
  restoreTables,
  saveZone,
  updateTable,
} from './mutations';

/** Tables and zones writes (P1-08) under RLS. Local Supabase. */

const EMAIL = { a: 'tables-a@example.org', b: 'tables-b@example.org' } as const;
const ids = { userA: '', userB: '', restaurantA: '', restaurantB: '' };

function scope(userId: string, restaurantId: string): BackofficeScope {
  const claims: SessionClaims = {
    sub: userId,
    role: 'authenticated',
    aal: 'aal1',
    platform_role: 'none',
    memberships: [{ restaurant_id: restaurantId, role: 'owner' }],
  };
  return { claims, restaurantId };
}
const scopeA = () => scope(ids.userA, ids.restaurantA);
const scopeB = () => scope(ids.userB, ids.restaurantB);

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
      venueName: `Tables ${key.toUpperCase()}`,
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [`tables-${key}`],
    });
    if (key === 'a') Object.assign(ids, { userA: data.user.id, restaurantA: venue.restaurantId });
    else Object.assign(ids, { userB: data.user.id, restaurantB: venue.restaurantId });
  }
}, 60_000);

afterAll(cleanup);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe('tables (P1-08)', () => {
  it('creates a range, refuses taken numbers and resolves tokens publicly', async () => {
    await createTables(scopeA(), range(1, 20), { label: null, zoneId: null });
    await expect(
      createTables(scopeA(), [5, 21], { label: null, zoneId: null }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', details: { numbers: [5] } });

    const { tables } = await loadTables(scopeA().claims, ids.restaurantA);
    expect(tables.map((table) => table.number)).toEqual(range(1, 20));
    const first = tables[0];
    expect(first?.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await getPublicTable(first?.token ?? '')).toEqual({
      restaurant_slug: 'tables-a',
      number: 1,
      label: null,
    });

    const fresh = await regenerateToken(scopeA(), first?.id ?? '');
    expect(await getPublicTable(first?.token ?? '')).toBeNull();
    expect((await getPublicTable(fresh))?.number).toBe(1);
  });

  it('edits, deletes and restores tables; zones detach on delete', async () => {
    const zoneId = await saveZone(scopeA(), null, { name: { fr: 'Terrasse' } });
    const [id] = await createTables(scopeA(), [50], { label: 'Bar', zoneId });
    await updateTable(scopeA(), id ?? '', { number: 51, label: null, zoneId });
    let row = (await loadTables(scopeA().claims, ids.restaurantA)).tables.find(
      (table) => table.id === id,
    );
    expect(row).toMatchObject({ number: 51, label: null, zoneId });

    await deleteZone(scopeA(), zoneId);
    row = (await loadTables(scopeA().claims, ids.restaurantA)).tables.find(
      (table) => table.id === id,
    );
    expect(row?.zoneId).toBeNull();

    await deleteTables(scopeA(), [id ?? '']);
    const deletedToken = row?.token ?? '';
    expect(await getPublicTable(deletedToken)).toBeNull();
    await restoreTables(scopeA(), [id ?? '']);
    expect((await getPublicTable(deletedToken))?.number).toBe(51);
  });

  it('keeps tables per tenant', async () => {
    const [id] = await createTables(scopeA(), [90], { label: null, zoneId: null });
    expect(
      (await loadTables(scopeB().claims, ids.restaurantB)).tables.some((table) => table.id === id),
    ).toBe(false);
    const asBOnA: BackofficeScope = { claims: scopeB().claims, restaurantId: ids.restaurantA };
    await expect(deleteTables(asBOnA, [id ?? ''])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(regenerateToken(asBOnA, id ?? '')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(createTables(asBOnA, [91], { label: null, zoneId: null })).rejects.toThrow();
  });
});
