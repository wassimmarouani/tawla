import 'server-only';
import { and, eq, inArray, isNotNull, isNull, max, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls, type DbTransaction } from '@/lib/db/rls';
import {
  categories,
  restaurants,
  optionGroups,
  options,
  productOptionGroups,
  products,
} from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import type { RoundingStep } from '@/lib/money';
import type { categoryInputSchema, productInputSchema } from '../schemas/menu-editor';
import type { optionGroupInputSchema } from '../schemas/options';
import { MAX_PRODUCT_PRICE } from '../schemas/menu-editor';
import { previewPriceChanges, type PriceChange } from '../services/bulk-price';
import { productSlug, sortOrders } from '../services/menu-text';

/**
 * Menu editor writes (P1-05). Framework-free so they run in integration tests: every function
 * works under the caller's RLS and scopes each statement to `restaurantId`, so a manager of B
 * can never touch A (CLAUDE.md rules 2 and 10). Callers validate input and check `menu.edit`.
 */
export interface EditorScope {
  claims: SessionClaims;
  restaurantId: string;
}

type CategoryValues = z.output<typeof categoryInputSchema>;
type ProductValues = z.output<typeof productInputSchema>;
type OptionGroupValues = z.output<typeof optionGroupInputSchema>;

const ORDER_STEP = 10;

function notFound(entity: string): AppError {
  return new AppError('NOT_FOUND', `${entity} not found`);
}

/** Throws NOT_FOUND unless every id was affected (missing, deleted or another tenant's). */
function expectAll(affected: number, expected: number, entity: string): void {
  if (affected !== expected) throw notFound(entity);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(scope: EditorScope, values: CategoryValues): Promise<string> {
  return withRls(scope.claims, async (tx) => {
    const [last] = await tx
      .select({ value: max(categories.sortOrder) })
      .from(categories)
      .where(and(eq(categories.restaurantId, scope.restaurantId), isNull(categories.deletedAt)));
    const [row] = await tx
      .insert(categories)
      .values({
        restaurantId: scope.restaurantId,
        name: values.name,
        isVisible: values.isVisible,
        availability: values.availability,
        sortOrder: (last?.value ?? 0) + ORDER_STEP,
      })
      .returning({ id: categories.id });
    if (!row) throw new AppError('INTERNAL', 'Category insert returned no row');
    return row.id;
  });
}

export async function updateCategory(
  scope: EditorScope,
  id: string,
  values: CategoryValues,
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(categories)
      .set({ name: values.name, isVisible: values.isVisible, availability: values.availability })
      .where(activeCategory(scope, [id]))
      .returning({ id: categories.id });
    expectAll(rows.length, 1, 'Category');
  });
}

export async function setCategoryVisibility(
  scope: EditorScope,
  id: string,
  visible: boolean,
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(categories)
      .set({ isVisible: visible })
      .where(activeCategory(scope, [id]))
      .returning({ id: categories.id });
    expectAll(rows.length, 1, 'Category');
  });
}

/**
 * Soft-deletes a category and its products with one timestamp, so that undo restores exactly
 * the products deleted with it.
 */
export async function deleteCategory(scope: EditorScope, id: string): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const now = await transactionNow(tx);
    const rows = await tx
      .update(categories)
      .set({ deletedAt: now })
      .where(activeCategory(scope, [id]))
      .returning({ id: categories.id });
    expectAll(rows.length, 1, 'Category');
    await tx
      .update(products)
      .set({ deletedAt: now })
      .where(
        and(
          eq(products.restaurantId, scope.restaurantId),
          eq(products.categoryId, id),
          isNull(products.deletedAt),
        ),
      );
  });
}

export async function restoreCategory(scope: EditorScope, id: string): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const [row] = await tx
      .select({ deletedAt: categories.deletedAt })
      .from(categories)
      .where(and(eq(categories.restaurantId, scope.restaurantId), eq(categories.id, id)));
    if (!row?.deletedAt) throw notFound('Category');
    const updated = await tx
      .update(categories)
      .set({ deletedAt: null })
      .where(and(eq(categories.restaurantId, scope.restaurantId), eq(categories.id, id)))
      .returning({ id: categories.id });
    expectAll(updated.length, 1, 'Category');
    const restored = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.restaurantId, scope.restaurantId),
          eq(products.categoryId, id),
          eq(products.deletedAt, row.deletedAt),
        ),
      );
    await restoreProductRows(
      tx,
      scope,
      restored.map((product) => product.id),
    );
  });
}

export async function reorderCategories(scope: EditorScope, ids: readonly string[]): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    let affected = 0;
    for (const { id, sortOrder } of sortOrders(ids)) {
      const rows = await tx
        .update(categories)
        .set({ sortOrder })
        .where(activeCategory(scope, [id]))
        .returning({ id: categories.id });
      affected += rows.length;
    }
    expectAll(affected, ids.length, 'Category');
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function createProduct(scope: EditorScope, values: ProductValues): Promise<string> {
  return withRls(scope.claims, async (tx) => {
    await assertCategory(tx, scope, values.categoryId);
    const [last] = await tx
      .select({ value: max(products.sortOrder) })
      .from(products)
      .where(
        and(
          eq(products.restaurantId, scope.restaurantId),
          eq(products.categoryId, values.categoryId),
          isNull(products.deletedAt),
        ),
      );
    const [row] = await tx
      .insert(products)
      .values({
        restaurantId: scope.restaurantId,
        categoryId: values.categoryId,
        slug: productSlug(values.name, await takenSlugs(tx, scope)),
        name: values.name,
        description: values.description,
        price: values.price,
        mediaId: values.mediaId,
        isAvailable: values.isAvailable,
        isVisible: values.isVisible,
        badges: values.badges,
        allergens: values.allergens,
        dietary: values.dietary,
        sortOrder: (last?.value ?? 0) + ORDER_STEP,
      })
      .returning({ id: products.id });
    if (!row) throw new AppError('INTERNAL', 'Product insert returned no row');
    await replaceOptionLinks(tx, scope, row.id, values.optionLinks);
    return row.id;
  });
}

export async function updateProduct(
  scope: EditorScope,
  id: string,
  values: ProductValues,
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    await assertCategory(tx, scope, values.categoryId);
    const rows = await tx
      .update(products)
      .set({
        categoryId: values.categoryId,
        name: values.name,
        description: values.description,
        price: values.price,
        mediaId: values.mediaId,
        isAvailable: values.isAvailable,
        isVisible: values.isVisible,
        badges: values.badges,
        allergens: values.allergens,
        dietary: values.dietary,
      })
      .where(activeProduct(scope, [id]))
      .returning({ id: products.id });
    expectAll(rows.length, 1, 'Product');
    await replaceOptionLinks(tx, scope, id, values.optionLinks);
  });
}

export async function setProductAvailability(
  scope: EditorScope,
  id: string,
  available: boolean,
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(products)
      .set({ isAvailable: available })
      .where(activeProduct(scope, [id]))
      .returning({ id: products.id });
    expectAll(rows.length, 1, 'Product');
  });
}

/** Shows or hides products; returns the ids whose visibility actually changed (for undo). */
export async function setProductsVisibility(
  scope: EditorScope,
  ids: readonly string[],
  visible: boolean,
): Promise<string[]> {
  return withRls(scope.claims, async (tx) => {
    await assertProducts(tx, scope, ids);
    const rows = await tx
      .update(products)
      .set({ isVisible: visible })
      .where(and(activeProduct(scope, ids), ne(products.isVisible, visible)))
      .returning({ id: products.id });
    return rows.map((row) => row.id);
  });
}

export async function deleteProducts(scope: EditorScope, ids: readonly string[]): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const now = await transactionNow(tx);
    const rows = await tx
      .update(products)
      .set({ deletedAt: now })
      .where(activeProduct(scope, ids))
      .returning({ id: products.id });
    expectAll(rows.length, ids.length, 'Product');
  });
}

export async function restoreProducts(scope: EditorScope, ids: readonly string[]): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.restaurantId, scope.restaurantId),
          inArray(products.id, [...ids]),
          sql`${products.deletedAt} is not null`,
        ),
      );
    expectAll(rows.length, ids.length, 'Product');
    await restoreProductRows(tx, scope, ids);
  });
}

export async function reorderProducts(
  scope: EditorScope,
  categoryId: string,
  ids: readonly string[],
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    let affected = 0;
    for (const { id, sortOrder } of sortOrders(ids)) {
      const rows = await tx
        .update(products)
        .set({ sortOrder })
        .where(and(activeProduct(scope, [id]), eq(products.categoryId, categoryId)))
        .returning({ id: products.id });
      affected += rows.length;
    }
    expectAll(affected, ids.length, 'Product');
  });
}

/**
 * Applies a percentage to the products' prices (rounded to `step`) and returns every change,
 * so the UI can confirm and undo it. The price history trigger records each new price.
 */
export async function adjustProductPrices(
  scope: EditorScope,
  ids: readonly string[],
  basisPoints: number,
  step: RoundingStep,
): Promise<PriceChange[]> {
  return withRls(scope.claims, async (tx) => {
    const current = await tx
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(activeProduct(scope, ids));
    expectAll(current.length, ids.length, 'Product');
    // Report changes in the order the caller listed them (the UI's order).
    const ordered = ids.flatMap((id) => current.filter((row) => row.id === id));
    const changes = previewPriceChanges(ordered, basisPoints, step, MAX_PRODUCT_PRICE).filter(
      (change) => change.after !== change.before,
    );
    for (const change of changes) {
      const rows = await tx
        .update(products)
        .set({ price: change.after })
        .where(activeProduct(scope, [change.id]))
        .returning({ id: products.id });
      // RLS filters updates silently: a role without write access affects no row.
      expectAll(rows.length, 1, 'Product');
    }
    return changes;
  });
}

/** Sets explicit prices (undo of a bulk change). */
export async function setProductPrices(
  scope: EditorScope,
  prices: readonly { id: string; price: number }[],
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    await assertProducts(
      tx,
      scope,
      prices.map((entry) => entry.id),
    );
    for (const entry of prices) {
      const rows = await tx
        .update(products)
        .set({ price: entry.price })
        .where(activeProduct(scope, [entry.id]))
        .returning({ id: products.id });
      expectAll(rows.length, 1, 'Product');
    }
  });
}

/**
 * Copies products (fields and option links) right after the originals, visible and with a free
 * slug. Returns the new ids in the order given.
 */
export async function duplicateProducts(
  scope: EditorScope,
  ids: readonly string[],
): Promise<string[]> {
  return withRls(scope.claims, async (tx) => {
    const sources = await tx.select().from(products).where(activeProduct(scope, ids));
    expectAll(sources.length, ids.length, 'Product');
    const taken = await takenSlugs(tx, scope);
    const created: string[] = [];
    for (const id of ids) {
      const source = sources.find((row) => row.id === id);
      if (!source) throw notFound('Product');
      const slug = productSlug({ fr: source.slug }, taken);
      taken.add(slug);
      const [row] = await tx
        .insert(products)
        .values({
          restaurantId: scope.restaurantId,
          categoryId: source.categoryId,
          slug,
          name: source.name,
          description: source.description,
          price: source.price,
          mediaId: source.mediaId,
          badges: source.badges,
          allergens: source.allergens,
          dietary: source.dietary,
          isAvailable: source.isAvailable,
          isVisible: source.isVisible,
          sortOrder: source.sortOrder + 1,
        })
        .returning({ id: products.id });
      if (!row) throw new AppError('INTERNAL', 'Product insert returned no row');
      const links = await tx
        .select()
        .from(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.restaurantId, scope.restaurantId),
            eq(productOptionGroups.productId, id),
          ),
        );
      if (links.length > 0) {
        await tx.insert(productOptionGroups).values(
          links.map((link) => ({
            restaurantId: scope.restaurantId,
            productId: row.id,
            optionGroupId: link.optionGroupId,
            sortOrder: link.sortOrder,
            minSelect: link.minSelect,
            maxSelect: link.maxSelect,
            priceOverrides: link.priceOverrides,
          })),
        );
      }
      created.push(row.id);
    }
    return created;
  });
}

// ---------------------------------------------------------------------------
// Option groups (ADR-0014)
// ---------------------------------------------------------------------------

/**
 * Creates or updates a reusable option group with its options in the given order: known ids
 * are updated, new ones inserted, missing ones soft-deleted.
 */
export async function saveOptionGroup(
  scope: EditorScope,
  id: string | null,
  values: OptionGroupValues,
): Promise<string> {
  return withRls(scope.claims, async (tx) => {
    let groupId: string;
    if (id === null) {
      const [row] = await tx
        .insert(optionGroups)
        .values({
          restaurantId: scope.restaurantId,
          name: values.name,
          minSelect: values.minSelect,
          maxSelect: values.maxSelect,
        })
        .returning({ id: optionGroups.id });
      if (!row) throw new AppError('INTERNAL', 'Option group insert returned no row');
      groupId = row.id;
    } else {
      const rows = await tx
        .update(optionGroups)
        .set({ name: values.name, minSelect: values.minSelect, maxSelect: values.maxSelect })
        .where(activeOptionGroup(scope, id))
        .returning({ id: optionGroups.id });
      expectAll(rows.length, 1, 'Option group');
      groupId = id;
    }

    const existing = await tx
      .select({ id: options.id })
      .from(options)
      .where(
        and(
          eq(options.restaurantId, scope.restaurantId),
          eq(options.optionGroupId, groupId),
          isNull(options.deletedAt),
        ),
      );
    const known = new Set(existing.map((row) => row.id));
    const kept = new Set<string>();
    for (const [index, option] of values.options.entries()) {
      const fields = {
        name: option.name,
        priceDelta: option.priceDelta,
        isAvailable: option.isAvailable,
        sortOrder: (index + 1) * ORDER_STEP,
      };
      if (option.id === null) {
        await tx
          .insert(options)
          .values({ ...fields, restaurantId: scope.restaurantId, optionGroupId: groupId });
        continue;
      }
      if (!known.has(option.id)) throw notFound('Option');
      kept.add(option.id);
      const rows = await tx
        .update(options)
        .set(fields)
        .where(and(eq(options.restaurantId, scope.restaurantId), eq(options.id, option.id)))
        .returning({ id: options.id });
      expectAll(rows.length, 1, 'Option');
    }
    const removed = [...known].filter((optionId) => !kept.has(optionId));
    if (removed.length > 0) {
      const now = await transactionNow(tx);
      await tx
        .update(options)
        .set({ deletedAt: now })
        .where(and(eq(options.restaurantId, scope.restaurantId), inArray(options.id, removed)));
    }
    return groupId;
  });
}

/** Soft-deletes a group: products keep their links, the public menu stops showing it. */
export async function deleteOptionGroup(scope: EditorScope, id: string): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const now = await transactionNow(tx);
    const rows = await tx
      .update(optionGroups)
      .set({ deletedAt: now })
      .where(activeOptionGroup(scope, id))
      .returning({ id: optionGroups.id });
    expectAll(rows.length, 1, 'Option group');
  });
}

export async function restoreOptionGroup(scope: EditorScope, id: string): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(optionGroups)
      .set({ deletedAt: null })
      .where(
        and(
          eq(optionGroups.restaurantId, scope.restaurantId),
          eq(optionGroups.id, id),
          isNotNull(optionGroups.deletedAt),
        ),
      )
      .returning({ id: optionGroups.id });
    expectAll(rows.length, 1, 'Option group');
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function activeOptionGroup(scope: EditorScope, id: string) {
  return and(
    eq(optionGroups.restaurantId, scope.restaurantId),
    eq(optionGroups.id, id),
    isNull(optionGroups.deletedAt),
  );
}

/**
 * Replaces a product's option links (order = display order). Overrides must leave the
 * effective rules valid (max ≥ min); price overrides of unknown options are dropped.
 */
async function replaceOptionLinks(
  tx: DbTransaction,
  scope: EditorScope,
  productId: string,
  links: ProductValues['optionLinks'],
): Promise<void> {
  const groupIds = links.map((link) => link.optionGroupId);
  const groups =
    groupIds.length === 0
      ? []
      : await tx
          .select({
            id: optionGroups.id,
            minSelect: optionGroups.minSelect,
            maxSelect: optionGroups.maxSelect,
          })
          .from(optionGroups)
          .where(
            and(
              eq(optionGroups.restaurantId, scope.restaurantId),
              inArray(optionGroups.id, groupIds),
              isNull(optionGroups.deletedAt),
            ),
          );
  expectAll(groups.length, groupIds.length, 'Option group');
  const optionRows =
    groupIds.length === 0
      ? []
      : await tx
          .select({ id: options.id, groupId: options.optionGroupId })
          .from(options)
          .where(
            and(
              eq(options.restaurantId, scope.restaurantId),
              inArray(options.optionGroupId, groupIds),
              isNull(options.deletedAt),
            ),
          );

  await tx
    .delete(productOptionGroups)
    .where(
      and(
        eq(productOptionGroups.restaurantId, scope.restaurantId),
        eq(productOptionGroups.productId, productId),
      ),
    );
  for (const [index, link] of links.entries()) {
    const group = groups.find((candidate) => candidate.id === link.optionGroupId);
    if (!group) throw notFound('Option group');
    if ((link.maxSelect ?? group.maxSelect) < (link.minSelect ?? group.minSelect)) {
      throw new AppError('VALIDATION_FAILED', 'Overrides leave max below min', {
        reason: 'minAboveMax',
      });
    }
    const known = new Set(
      optionRows.filter((row) => row.groupId === group.id).map((row) => row.id),
    );
    await tx.insert(productOptionGroups).values({
      restaurantId: scope.restaurantId,
      productId,
      optionGroupId: group.id,
      sortOrder: (index + 1) * ORDER_STEP,
      minSelect: link.minSelect,
      maxSelect: link.maxSelect,
      priceOverrides: Object.fromEntries(
        Object.entries(link.priceOverrides).filter(([optionId]) => known.has(optionId)),
      ),
    });
  }
}

function activeCategory(scope: EditorScope, ids: readonly string[]) {
  return and(
    eq(categories.restaurantId, scope.restaurantId),
    inArray(categories.id, [...ids]),
    isNull(categories.deletedAt),
  );
}

function activeProduct(scope: EditorScope, ids: readonly string[]) {
  return and(
    eq(products.restaurantId, scope.restaurantId),
    inArray(products.id, [...ids]),
    isNull(products.deletedAt),
  );
}

async function assertCategory(tx: DbTransaction, scope: EditorScope, id: string): Promise<void> {
  const rows = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(activeCategory(scope, [id]));
  expectAll(rows.length, 1, 'Category');
}

async function assertProducts(
  tx: DbTransaction,
  scope: EditorScope,
  ids: readonly string[],
): Promise<void> {
  const rows = await tx.select({ id: products.id }).from(products).where(activeProduct(scope, ids));
  expectAll(rows.length, ids.length, 'Product');
}

async function takenSlugs(tx: DbTransaction, scope: EditorScope): Promise<Set<string>> {
  const rows = await tx
    .select({ slug: products.slug })
    .from(products)
    .where(and(eq(products.restaurantId, scope.restaurantId), isNull(products.deletedAt)));
  return new Set(rows.map((row) => row.slug));
}

/** Restores products, renaming a slug that a newer product took in the meantime. */
async function restoreProductRows(
  tx: DbTransaction,
  scope: EditorScope,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const taken = await takenSlugs(tx, scope);
  const rows = await tx
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(and(eq(products.restaurantId, scope.restaurantId), inArray(products.id, [...ids])));
  for (const row of rows) {
    const slug = taken.has(row.slug) ? productSlug({ fr: row.slug }, taken) : row.slug;
    taken.add(slug);
    const updated = await tx
      .update(products)
      .set({ deletedAt: null, slug })
      .where(and(eq(products.restaurantId, scope.restaurantId), eq(products.id, row.id)))
      .returning({ id: products.id });
    expectAll(updated.length, 1, 'Product');
  }
}

/** `now()` of the transaction, so related soft deletes share one timestamp. */
async function transactionNow(tx: DbTransaction): Promise<string> {
  const [row] = await tx.execute<{ now: string }>(sql`select now()::text as now`);
  if (!row) throw new AppError('INTERNAL', 'now() returned no row');
  return row.now;
}

/** Links the venue logo and cover (P1-14); the media rows belong to the restaurant (FK). */
export async function setVenueMedia(
  scope: EditorScope,
  values: { logoMediaId: string | null; coverMediaId: string | null },
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(restaurants)
      .set({ logoMediaId: values.logoMediaId, coverMediaId: values.coverMediaId })
      .where(eq(restaurants.id, scope.restaurantId))
      .returning({ id: restaurants.id });
    if (rows.length === 0) throw notFound('Restaurant');
  });
}
