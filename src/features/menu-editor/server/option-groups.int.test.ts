import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { displayPrice, publicMenuSchema } from '@/features/menu';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { loadOptionGroups, loadProductOptionLinks } from '../queries/editor-menu';
import {
  createCategory,
  createProduct,
  deleteOptionGroup,
  restoreOptionGroup,
  saveOptionGroup,
  updateProduct,
  type EditorScope,
} from './mutations';

/** Option groups and product links (P1-06, ADR-0014) under RLS. Local Supabase. */

const EMAIL = { a: 'option-groups-a@example.org', b: 'option-groups-b@example.org' } as const;
const SLUG = 'option-groups-a';
const ids = { userA: '', userB: '', restaurantA: '', restaurantB: '' };

function scope(userId: string, restaurantId: string): EditorScope {
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

const product = (categoryId: string, name: string, price: number) => ({
  categoryId,
  name: { fr: name },
  description: {},
  price,
  mediaId: null,
  isAvailable: true,
  isVisible: true,
  badges: [] as 'new'[],
  allergens: [] as 'milk'[],
  dietary: [] as 'vegan'[],
  optionLinks: [] as {
    optionGroupId: string;
    minSelect: number | null;
    maxSelect: number | null;
    priceOverrides: Record<string, number>;
  }[],
});

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

async function publicProducts() {
  const [row] = await rawDb().execute<{ menu: unknown }>(
    sql`select public.get_public_menu(${SLUG}, 'fr') as menu`,
  );
  return publicMenuSchema.parse(row?.menu).categories.flatMap((category) => category.products);
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
      venueName: `Options ${key.toUpperCase()}`,
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [`option-groups-${key}`],
    });
    if (key === 'a') Object.assign(ids, { userA: data.user.id, restaurantA: venue.restaurantId });
    else Object.assign(ids, { userB: data.user.id, restaurantB: venue.restaurantId });
  }
}, 60_000);

afterAll(cleanup);

describe('option groups (P1-06)', () => {
  it('shares a Size group with per-product prices; the menu shows "from" prices', async () => {
    const sizeId = await saveOptionGroup(scopeA(), null, {
      name: { fr: 'Taille' },
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: null, name: { fr: 'Normal' }, priceDelta: 0, isAvailable: true },
        { id: null, name: { fr: 'Grand' }, priceDelta: 1500, isAvailable: true },
      ],
    });
    const [group] = await loadOptionGroups(scopeA().claims, ids.restaurantA);
    const large = group?.options.find((option) => option.name.fr === 'Grand');
    expect(group).toMatchObject({ id: sizeId, minSelect: 1, maxSelect: 1, usage: 0 });
    expect(large).toBeDefined();

    const categoryId = await createCategory(scopeA(), {
      name: { fr: 'Boissons' },
      isVisible: true,
      availability: null,
    });
    const coffee = product(categoryId, 'Café', 2500);
    coffee.optionLinks = [
      { optionGroupId: sizeId, minSelect: null, maxSelect: null, priceOverrides: {} },
    ];
    coffee.badges = ['new'];
    coffee.allergens = ['milk'];
    await createProduct(scopeA(), coffee);
    const juice = product(categoryId, 'Jus', 5000);
    juice.optionLinks = [
      {
        optionGroupId: sizeId,
        minSelect: null,
        maxSelect: null,
        priceOverrides: { [large?.id ?? '']: 2000 },
      },
    ];
    const juiceId = await createProduct(scopeA(), juice);

    expect(await loadProductOptionLinks(scopeA().claims, ids.restaurantA, juiceId)).toEqual([
      {
        optionGroupId: sizeId,
        minSelect: null,
        maxSelect: null,
        priceOverrides: { [large?.id ?? '']: 2000 },
      },
    ]);
    expect((await loadOptionGroups(scopeA().claims, ids.restaurantA))[0]?.usage).toBe(2);

    const menu = await publicProducts();
    const coffeeOnMenu = menu.find((entry) => entry.name.text === 'Café');
    const juiceOnMenu = menu.find((entry) => entry.name.text === 'Jus');
    expect(coffeeOnMenu?.badges).toEqual(['new']);
    expect(coffeeOnMenu?.allergens).toEqual(['milk']);
    expect(displayPrice(coffeeOnMenu ?? { price: 0, option_groups: [] })).toEqual({
      amount: 2500,
      from: true,
    });
    expect(juiceOnMenu?.option_groups[0]?.price_overrides).toEqual({ [large?.id ?? '']: 2000 });

    // Removing an option soft-deletes it; a deleted group disappears from the menu.
    await saveOptionGroup(scopeA(), sizeId, {
      name: { fr: 'Taille' },
      minSelect: 0,
      maxSelect: 1,
      options: [
        { id: large?.id ?? null, name: { fr: 'Grand' }, priceDelta: 1500, isAvailable: true },
      ],
    });
    expect((await loadOptionGroups(scopeA().claims, ids.restaurantA))[0]?.options).toHaveLength(1);
    await deleteOptionGroup(scopeA(), sizeId);
    expect((await publicProducts()).every((entry) => entry.option_groups.length === 0)).toBe(true);
    await restoreOptionGroup(scopeA(), sizeId);
    expect((await publicProducts()).some((entry) => entry.option_groups.length === 1)).toBe(true);
  });

  it('rejects overrides that leave max below min', async () => {
    const groupId = await saveOptionGroup(scopeA(), null, {
      name: { fr: 'Sucre' },
      minSelect: 0,
      maxSelect: 1,
      options: [{ id: null, name: { fr: 'Sans sucre' }, priceDelta: 0, isAvailable: true }],
    });
    const categoryId = await createCategory(scopeA(), {
      name: { fr: 'Thés' },
      isVisible: true,
      availability: null,
    });
    const tea = product(categoryId, 'Thé', 1500);
    const teaId = await createProduct(scopeA(), tea);
    tea.optionLinks = [
      { optionGroupId: groupId, minSelect: 3, maxSelect: null, priceOverrides: {} },
    ];
    await expect(updateProduct(scopeA(), teaId, tea)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('keeps groups per tenant', async () => {
    const groupId = await saveOptionGroup(scopeA(), null, {
      name: { fr: 'Privé' },
      minSelect: 0,
      maxSelect: 1,
      options: [{ id: null, name: { fr: 'X' }, priceDelta: 0, isAvailable: true }],
    });
    expect(
      (await loadOptionGroups(scopeB().claims, ids.restaurantB)).some(
        (group) => group.id === groupId,
      ),
    ).toBe(false);
    await expect(deleteOptionGroup(scopeB(), groupId)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const categoryB = await createCategory(scopeB(), {
      name: { fr: 'B' },
      isVisible: true,
      availability: null,
    });
    const intruder = product(categoryB, 'Intrus', 1000);
    intruder.optionLinks = [
      { optionGroupId: groupId, minSelect: null, maxSelect: null, priceOverrides: {} },
    ];
    await expect(createProduct(scopeB(), intruder)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
