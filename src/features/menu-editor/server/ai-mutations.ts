import 'server-only';
import { and, eq, isNull, max, sql } from 'drizzle-orm';
import type { MenuDraft, TranslationSource, TranslationSuggestion } from '@/features/ai';
import { LOCALES, type Locale } from '@/i18n/locales';
import { withRls } from '@/lib/db/rls';
import { categories, products } from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import { productSlug } from '../services/menu-text';
import type { EditorScope } from './mutations';

/**
 * Menu writes for AI features (P1-13): importing an accepted draft and applying accepted
 * translations. Under the manager's RLS, scoped to the restaurant (CLAUDE.md rules 2, 8).
 */

const ORDER_STEP = 10;
type I18n = Partial<Record<Locale, string>>;

const lower = (value: string) => value.trim().toLocaleLowerCase();

/**
 * Adds the products the owner kept: into an existing category with the same name (any
 * language), or a new one. Names are stored in the draft's language; nothing is published that
 * the owner did not tick.
 */
export async function importDraft(
  scope: EditorScope,
  draft: MenuDraft,
): Promise<{ categories: number; products: number }> {
  return withRls(scope.claims, async (tx) => {
    const existing = await tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.restaurantId, scope.restaurantId), isNull(categories.deletedAt)));
    const byName = new Map<string, string>();
    for (const category of existing) {
      for (const value of Object.values(category.name as I18n)) {
        if (value) byName.set(lower(value), category.id);
      }
    }
    const [lastCategory] = await tx
      .select({ value: max(categories.sortOrder) })
      .from(categories)
      .where(eq(categories.restaurantId, scope.restaurantId));
    let categoryOrder = lastCategory?.value ?? 0;
    const taken = new Set(
      (
        await tx
          .select({ slug: products.slug })
          .from(products)
          .where(and(eq(products.restaurantId, scope.restaurantId), isNull(products.deletedAt)))
      ).map((row) => row.slug),
    );

    let createdCategories = 0;
    let createdProducts = 0;
    for (const category of draft.categories) {
      const kept = category.products.filter((product) => product.include && product.price !== null);
      if (kept.length === 0) continue;
      let categoryId = byName.get(lower(category.name));
      if (!categoryId) {
        categoryOrder += ORDER_STEP;
        const [row] = await tx
          .insert(categories)
          .values({
            restaurantId: scope.restaurantId,
            name: { [draft.language]: category.name },
            sortOrder: categoryOrder,
          })
          .returning({ id: categories.id });
        if (!row) throw new AppError('INTERNAL', 'Category insert returned no row');
        categoryId = row.id;
        byName.set(lower(category.name), row.id);
        createdCategories += 1;
      }
      const [lastProduct] = await tx
        .select({ value: max(products.sortOrder) })
        .from(products)
        .where(
          and(eq(products.restaurantId, scope.restaurantId), eq(products.categoryId, categoryId)),
        );
      let productOrder = lastProduct?.value ?? 0;
      for (const product of kept) {
        const name = { [draft.language]: product.name };
        const slug = productSlug(name, taken);
        taken.add(slug);
        productOrder += ORDER_STEP;
        await tx.insert(products).values({
          restaurantId: scope.restaurantId,
          categoryId,
          slug,
          name,
          description: product.description ? { [draft.language]: product.description } : {},
          price: product.price ?? 0,
          sortOrder: productOrder,
        });
        createdProducts += 1;
      }
    }
    return { categories: createdCategories, products: createdProducts };
  });
}

/** Category and product texts missing at least one of `locales` (first 150, menu order). */
export async function loadTranslationSources(
  scope: EditorScope,
  locales: readonly Locale[],
): Promise<TranslationSource[]> {
  return withRls(scope.claims, async (tx) => {
    const categoryRows = await tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.restaurantId, scope.restaurantId), isNull(categories.deletedAt)))
      .orderBy(categories.sortOrder);
    const productRows = await tx
      .select({ id: products.id, name: products.name, description: products.description })
      .from(products)
      .where(and(eq(products.restaurantId, scope.restaurantId), isNull(products.deletedAt)))
      .orderBy(products.sortOrder);
    const missing = (name: I18n) => locales.some((locale) => !name[locale]?.trim());
    const sources: TranslationSource[] = [
      ...categoryRows
        .filter((row) => missing(row.name as I18n))
        .map((row) => ({
          id: `category:${row.id}` as const,
          name: row.name as I18n,
          description: null,
        })),
      ...productRows
        .filter((row) => missing(row.name as I18n))
        .map((row) => ({
          id: `product:${row.id}` as const,
          name: row.name as I18n,
          description: Object.keys((row.description as I18n | null) ?? {}).length
            ? (row.description as I18n)
            : null,
        })),
    ];
    return sources.slice(0, 150);
  });
}

/**
 * Applies accepted suggestions without overwriting text the owner typed: a language that got a
 * value in the meantime keeps it.
 */
export async function applyTranslations(
  scope: EditorScope,
  suggestions: readonly TranslationSuggestion[],
): Promise<number> {
  return withRls(scope.claims, async (tx) => {
    let applied = 0;
    for (const suggestion of suggestions) {
      const [kind, id] = suggestion.id.split(':') as ['product' | 'category', string];
      if (!LOCALES.includes(suggestion.locale)) continue;
      const name = sql`jsonb_build_object(${suggestion.locale}::text, ${suggestion.name}::text)`;
      if (kind === 'category') {
        const rows = await tx
          .update(categories)
          .set({ name: sql`${name} || ${categories.name}` })
          .where(
            and(
              eq(categories.restaurantId, scope.restaurantId),
              eq(categories.id, id),
              isNull(categories.deletedAt),
            ),
          )
          .returning({ id: categories.id });
        applied += rows.length;
        continue;
      }
      const description = suggestion.description
        ? sql`case when ${products.description} = '{}'::jsonb then ${products.description} else jsonb_build_object(${suggestion.locale}::text, ${suggestion.description}::text) || ${products.description} end`
        : sql`${products.description}`;
      const rows = await tx
        .update(products)
        .set({ name: sql`${name} || ${products.name}`, description })
        .where(
          and(
            eq(products.restaurantId, scope.restaurantId),
            eq(products.id, id),
            isNull(products.deletedAt),
          ),
        )
        .returning({ id: products.id });
      applied += rows.length;
    }
    return applied;
  });
}
