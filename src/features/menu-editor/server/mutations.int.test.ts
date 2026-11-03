import { createClient } from '@supabase/supabase-js';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { priceHistory, products } from '@/lib/db/schema/schema';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { loadEditorMenu, loadEditorProduct } from '../queries/editor-menu';
import {
  adjustProductPrices,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProducts,
  duplicateProducts,
  reorderProducts,
  restoreCategory,
  restoreProducts,
  setProductAvailability,
  setProductPrices,
  setProductsVisibility,
  updateProduct,
  type EditorScope,
} from './mutations';

/** Menu editor writes (P1-05) under RLS: behaviour and tenant isolation. Local Supabase. */

const EMAIL = { a: 'menu-editor-a@example.org', b: 'menu-editor-b@example.org' } as const;
const ids = { userA: '', userB: '', restaurantA: '', restaurantB: '' };

function claimsFor(userId: string, restaurantId: string, role: string): SessionClaims {
  return {
    sub: userId,
    role: 'authenticated',
    aal: 'aal1',
    platform_role: 'none',
    memberships: [{ restaurant_id: restaurantId, role }],
  } as SessionClaims;
}

const scopeA = (): EditorScope => ({
  claims: claimsFor(ids.userA, ids.restaurantA, 'owner'),
  restaurantId: ids.restaurantA,
});
const scopeB = (): EditorScope => ({
  claims: claimsFor(ids.userB, ids.restaurantB, 'owner'),
  restaurantId: ids.restaurantB,
});

const CATEGORY = { name: { fr: 'Boissons chaudes' }, isVisible: true, availability: null };
const product = (categoryId: string, name: string, price: number) => ({
  categoryId,
  name: { fr: name },
  description: {},
  price,
  mediaId: null,
  isAvailable: true,
  isVisible: true,
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
      venueName: `Menu editor ${key.toUpperCase()}`,
      venueType: 'cafe',
      locale: 'fr',
      slugCandidates: [`menu-editor-${key}`],
    });
    if (key === 'a') Object.assign(ids, { userA: data.user.id, restaurantA: venue.restaurantId });
    else Object.assign(ids, { userB: data.user.id, restaurantB: venue.restaurantId });
  }
}, 60_000);

afterAll(cleanup);

describe('menu editor mutations (P1-05)', () => {
  it('creates, orders, edits, toggles and reads back a menu', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const espresso = await createProduct(scopeA(), product(categoryId, 'Café express', 1500));
    const latte = await createProduct(scopeA(), product(categoryId, 'Café crème', 2500));
    const twin = await createProduct(scopeA(), product(categoryId, 'Café express', 1600));

    await reorderProducts(scopeA(), categoryId, [latte, espresso, twin]);
    await setProductAvailability(scopeA(), latte, false);
    await updateProduct(scopeA(), espresso, {
      ...product(categoryId, 'Espresso', 1800),
      name: { fr: 'Espresso', ar: 'إسبريسو' },
    });

    const menu = await loadEditorMenu(scopeA().claims, ids.restaurantA);
    const category = menu.find((entry) => entry.id === categoryId);
    expect(category?.products.map((entry) => entry.id)).toEqual([latte, espresso, twin]);
    expect(category?.products[0]).toMatchObject({ slug: 'cafe-creme', isAvailable: false });
    expect(category?.products[1]).toMatchObject({
      name: { fr: 'Espresso', ar: 'إسبريسو' },
      price: 1800,
      slug: 'cafe-express',
    });
    expect(category?.products[2]?.slug).toBe('cafe-express-2');
  });

  it('applies a bulk percentage, records price history and undoes it', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const a = await createProduct(scopeA(), product(categoryId, 'Thé', 1000));
    const b = await createProduct(scopeA(), product(categoryId, 'Thé aux pignons', 3500));

    const changes = await adjustProductPrices(scopeA(), [a, b], 1000, 100);
    expect(changes).toEqual([
      { id: a, before: 1000, after: 1100 },
      { id: b, before: 3500, after: 3900 },
    ]);
    const history = await rawDb()
      .select({ price: priceHistory.newPrice })
      .from(priceHistory)
      .where(eq(priceHistory.productId, b));
    expect(history.map((row) => row.price)).toContain(3900);

    await setProductPrices(
      scopeA(),
      changes.map((change) => ({ id: change.id, price: change.before })),
    );
    expect((await loadEditorProduct(scopeA().claims, ids.restaurantA, b))?.price).toBe(3500);
  });

  it('hides, duplicates, deletes and restores products', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const a = await createProduct(scopeA(), product(categoryId, 'Citronnade', 3000));

    expect(await setProductsVisibility(scopeA(), [a], false)).toEqual([a]);
    expect(await setProductsVisibility(scopeA(), [a], false)).toEqual([]);

    const [copy] = await duplicateProducts(scopeA(), [a]);
    expect(copy).toBeDefined();
    const duplicated = await loadEditorProduct(scopeA().claims, ids.restaurantA, copy ?? '');
    expect(duplicated).toMatchObject({ name: { fr: 'Citronnade' }, slug: 'citronnade-2' });

    await deleteProducts(scopeA(), [a]);
    expect(await loadEditorProduct(scopeA().claims, ids.restaurantA, a)).toBeNull();
    // A new product takes the slug while the original is deleted.
    const taker = await createProduct(scopeA(), product(categoryId, 'Citronnade', 3200));
    await restoreProducts(scopeA(), [a]);
    const restored = await loadEditorProduct(scopeA().claims, ids.restaurantA, a);
    expect(restored?.slug).not.toBe(
      (await loadEditorProduct(scopeA().claims, ids.restaurantA, taker))?.slug,
    );
  });

  it('deletes a category with its products and restores exactly those', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const kept = await createProduct(scopeA(), product(categoryId, 'Kept', 1000));
    const earlier = await createProduct(scopeA(), product(categoryId, 'Deleted earlier', 1000));
    await deleteProducts(scopeA(), [earlier]);

    await deleteCategory(scopeA(), categoryId);
    let menu = await loadEditorMenu(scopeA().claims, ids.restaurantA);
    expect(menu.some((entry) => entry.id === categoryId)).toBe(false);

    await restoreCategory(scopeA(), categoryId);
    menu = await loadEditorMenu(scopeA().claims, ids.restaurantA);
    expect(menu.find((entry) => entry.id === categoryId)?.products.map((p) => p.id)).toEqual([
      kept,
    ]);
  });
});

describe('menu editor tenant isolation (P1-05)', () => {
  it('an owner of B cannot read or change A’s menu', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const target = await createProduct(scopeA(), product(categoryId, 'Protected', 2000));
    const asBOnA: EditorScope = { claims: scopeB().claims, restaurantId: ids.restaurantA };

    expect(await loadEditorMenu(scopeB().claims, ids.restaurantA)).toEqual([]);
    expect(await loadEditorProduct(scopeB().claims, ids.restaurantA, target)).toBeNull();
    await expect(setProductAvailability(asBOnA, target, false)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(adjustProductPrices(asBOnA, [target], 5000, 100)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(deleteProducts(asBOnA, [target])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(createCategory(asBOnA, CATEGORY)).rejects.toThrow();
    // B's own scope never matches A's ids either.
    await expect(setProductPrices(scopeB(), [{ id: target, price: 1 }])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const [row] = await rawDb()
      .select({ price: products.price, isAvailable: products.isAvailable })
      .from(products)
      .where(and(eq(products.id, target), eq(products.restaurantId, ids.restaurantA)));
    expect(row).toEqual({ price: 2000, isAvailable: true });
  });

  it('floor staff of A cannot edit the menu', async () => {
    const categoryId = await createCategory(scopeA(), CATEGORY);
    const target = await createProduct(scopeA(), product(categoryId, 'Staff', 2000));
    const counter: EditorScope = {
      claims: claimsFor(ids.userA, ids.restaurantA, 'counter'),
      restaurantId: ids.restaurantA,
    };
    await expect(adjustProductPrices(counter, [target], 1000, 100)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(createCategory(counter, CATEGORY)).rejects.toThrow();
  });
});
