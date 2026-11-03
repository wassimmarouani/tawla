import { createClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { categories, products } from '@/lib/db/schema/schema';
import { aiQuotaState, logAiUsage } from '@/server/admin/ai-usage';
import { createVenue } from '@/server/admin/onboarding';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { applyTranslations, importDraft, loadTranslationSources } from './ai-mutations';
import type { EditorScope } from './mutations';

/** AI menu import and translation writes (P1-13), quotas and usage. Local Supabase. */

const EMAIL = 'ai-import-owner@example.org';
const SLUG = 'ai-import-cafe';
const ids = { user: '', restaurant: '' };

const scope = (): EditorScope => ({
  claims: {
    sub: ids.user,
    role: 'authenticated',
    aal: 'aal1',
    platform_role: 'none',
    memberships: [{ restaurant_id: ids.restaurant, role: 'owner' }],
  },
  restaurantId: ids.restaurant,
});

async function cleanup() {
  await rawDb().execute(sql`
    with gone as (
      delete from public.restaurants where slug = ${SLUG} returning organization_id)
    delete from public.organizations where id in (select organization_id from gone)
  `);
  await rawDb().execute(sql`delete from auth.users where email = ${EMAIL}`);
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
    venueName: 'AI import',
    venueType: 'cafe',
    locale: 'fr',
    slugCandidates: [SLUG],
  });
  Object.assign(ids, { user: data.user.id, restaurant: venue.restaurantId });
}, 60_000);

afterAll(cleanup);

const draftProduct = (name: string, price: number | null, include = true) => ({
  name,
  description: null,
  priceText: price === null ? null : String(price / 1000),
  price,
  confidence: 'high' as const,
  include,
});

describe('AI menu import (P1-13)', () => {
  it('imports only the kept products, merging categories by name, with unique slugs', async () => {
    const first = await importDraft(scope(), {
      language: 'fr',
      categories: [
        {
          name: 'Boissons',
          products: [
            draftProduct('Express', 1800),
            draftProduct('Express', 2000),
            draftProduct('Illisible', null, true),
            draftProduct('Décoché', 3000, false),
          ],
        },
      ],
    });
    expect(first).toEqual({ categories: 1, products: 2 });
    const second = await importDraft(scope(), {
      language: 'fr',
      categories: [{ name: 'boissons', products: [draftProduct('Citronnade', 3500)] }],
    });
    expect(second).toEqual({ categories: 0, products: 1 });
    const rows = await rawDb()
      .select({ slug: products.slug, price: products.price, name: products.name })
      .from(products)
      .where(eq(products.restaurantId, ids.restaurant))
      .orderBy(products.sortOrder);
    expect(rows.map((row) => row.slug)).toEqual(['express', 'express-2', 'citronnade']);
    expect(rows.map((row) => row.price)).toEqual([1800, 2000, 3500]);
  });

  it('lists texts missing a language and applies translations without overwriting', async () => {
    const sources = await loadTranslationSources(scope(), ['fr', 'ar', 'en']);
    expect(sources.length).toBe(4);
    const category = sources.find((source) => source.id.startsWith('category:'));
    const product = sources.find((source) => source.id.startsWith('product:'));
    if (!category || !product) throw new Error('sources expected');
    // The owner types an English name in the meantime: the suggestion must not replace it.
    await rawDb()
      .update(categories)
      .set({ name: { fr: 'Boissons', en: 'Drinks (owner)' } })
      .where(eq(categories.id, category.id.slice('category:'.length)));
    const applied = await applyTranslations(scope(), [
      { id: category.id, locale: 'en', name: 'Drinks', description: null },
      { id: category.id, locale: 'ar', name: 'مشروبات', description: null },
      { id: product.id, locale: 'ar', name: 'إكسبريس', description: null },
    ]);
    expect(applied).toBe(3);
    const [row] = await rawDb()
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, category.id.slice('category:'.length)));
    expect(row?.name).toEqual({ fr: 'Boissons', en: 'Drinks (owner)', ar: 'مشروبات' });
  });

  it('counts this month’s usage against the Basic plan', async () => {
    const before = await aiQuotaState(ids.restaurant);
    expect(before.limits).toEqual({ photoImports: 3, translatedItems: 300, capMillimes: 3000 });
    await logAiUsage({
      restaurantId: ids.restaurant,
      actorId: ids.user,
      feature: 'menu_import',
      model: 'gemini-2.5-flash',
      inputTokens: 1500,
      outputTokens: 400,
      costMillimes: 5,
      units: 1,
    });
    await logAiUsage({
      restaurantId: ids.restaurant,
      actorId: ids.user,
      feature: 'translation',
      model: 'gemini-2.5-flash',
      inputTokens: 900,
      outputTokens: 700,
      costMillimes: 7,
      units: 42,
    });
    expect((await aiQuotaState(ids.restaurant)).used).toEqual({
      photoImports: 1,
      translatedItems: 42,
      costMillimes: 12,
    });
  });
});
