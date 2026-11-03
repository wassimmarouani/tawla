import 'server-only';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import {
  categories,
  media,
  optionGroups,
  options,
  productOptionGroups,
  products,
} from '@/lib/db/schema/schema';
import type { MediaRenditions } from '@/lib/media/urls';
import {
  ALLERGENS,
  BADGES,
  DIETARY,
  type Allergen,
  type Badge,
  type Dietary,
} from '@/lib/menu/attributes';
import { scheduleSchema, type Schedule } from '@/lib/schedule';
import { storedI18nSchema, type I18nText } from '../schemas/i18n-text';

export interface EditorMedia {
  id: string;
  basePath: string;
  width: number;
  height: number;
  renditions: MediaRenditions;
  dominantColor: string | null;
}

export interface EditorProduct {
  id: string;
  categoryId: string;
  slug: string;
  name: I18nText;
  description: I18nText;
  price: number;
  isAvailable: boolean;
  isVisible: boolean;
  media: EditorMedia | null;
  badges: Badge[];
  allergens: Allergen[];
  dietary: Dietary[];
}

/** A product's use of an option group, with its overrides (ADR-0014 §2). */
export interface EditorOptionLink {
  optionGroupId: string;
  minSelect: number | null;
  maxSelect: number | null;
  priceOverrides: Record<string, number>;
}

export interface EditorOption {
  id: string;
  name: I18nText;
  priceDelta: number;
  isAvailable: boolean;
}

export interface EditorOptionGroup {
  id: string;
  name: I18nText;
  minSelect: number;
  maxSelect: number;
  options: EditorOption[];
  /** Products (not deleted) using the group. */
  usage: number;
}

export interface EditorCategory {
  id: string;
  name: I18nText;
  isVisible: boolean;
  availability: Schedule | null;
  products: EditorProduct[];
}

/** Attribute arrays, validated on read; unknown values (newer enums) are dropped. */
const attributesSchema = {
  badges: z.array(z.string()).transform((values) => values.filter(isBadge)),
  allergens: z.array(z.string()).transform((values) => values.filter(isAllergen)),
  dietary: z.array(z.string()).transform((values) => values.filter(isDietary)),
};

function isBadge(value: string): value is Badge {
  return (BADGES as readonly string[]).includes(value);
}
function isAllergen(value: string): value is Allergen {
  return (ALLERGENS as readonly string[]).includes(value);
}
function isDietary(value: string): value is Dietary {
  return (DIETARY as readonly string[]).includes(value);
}

/** `product_option_groups.price_overrides` jsonb: option id → millimes. */
const priceOverridesSchema = z.record(z.string(), z.int().min(0)).catch({});

/** `media.renditions` jsonb (ADR-0018), validated on read (CLAUDE.md rule 3). */
const renditionsSchema = z
  .object({
    widths: z.array(z.int().positive()),
    formats: z.array(z.enum(['avif', 'webp', 'png'])),
  })
  .catch({ widths: [], formats: [] });

function toMedia(row: {
  mediaId: string | null;
  basePath: string | null;
  width: number | null;
  height: number | null;
  renditions: unknown;
  dominantColor: string | null;
}): EditorMedia | null {
  if (!row.mediaId || !row.basePath || !row.width || !row.height) return null;
  return {
    id: row.mediaId,
    basePath: row.basePath,
    width: row.width,
    height: row.height,
    renditions: renditionsSchema.parse(row.renditions),
    dominantColor: row.dominantColor,
  };
}

const mediaColumns = {
  mediaId: media.id,
  basePath: media.basePath,
  width: media.width,
  height: media.height,
  renditions: media.renditions,
  dominantColor: media.dominantColor,
};

/** Categories with their products, in menu order, as the editor shows them (under RLS). */
export async function loadEditorMenu(
  claims: SessionClaims,
  restaurantId: string,
): Promise<EditorCategory[]> {
  return withRls(claims, async (tx) => {
    const categoryRows = await tx
      .select({
        id: categories.id,
        name: categories.name,
        isVisible: categories.isVisible,
        availability: categories.availability,
      })
      .from(categories)
      .where(and(eq(categories.restaurantId, restaurantId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

    const productRows = await tx
      .select({
        id: products.id,
        categoryId: products.categoryId,
        slug: products.slug,
        name: products.name,
        description: products.description,
        price: products.price,
        isAvailable: products.isAvailable,
        isVisible: products.isVisible,
        badges: products.badges,
        allergens: products.allergens,
        dietary: products.dietary,
        ...mediaColumns,
      })
      .from(products)
      .leftJoin(
        media,
        and(
          eq(media.restaurantId, products.restaurantId),
          eq(media.id, products.mediaId),
          isNull(media.deletedAt),
        ),
      )
      .where(and(eq(products.restaurantId, restaurantId), isNull(products.deletedAt)))
      .orderBy(asc(products.sortOrder), asc(products.createdAt));

    const byCategory = new Map<string, EditorProduct[]>();
    for (const row of productRows) {
      const list = byCategory.get(row.categoryId) ?? [];
      list.push(toProduct(row));
      byCategory.set(row.categoryId, list);
    }

    return categoryRows.map((row) => ({
      id: row.id,
      name: storedI18nSchema.parse(row.name),
      isVisible: row.isVisible,
      availability: parseSchedule(row.availability),
      products: byCategory.get(row.id) ?? [],
    }));
  });
}

/** One product for the edit form, or `null` when missing or deleted (under RLS). */
export async function loadEditorProduct(
  claims: SessionClaims,
  restaurantId: string,
  productId: string,
): Promise<EditorProduct | null> {
  return withRls(claims, async (tx) => {
    const [row] = await tx
      .select({
        id: products.id,
        categoryId: products.categoryId,
        slug: products.slug,
        name: products.name,
        description: products.description,
        price: products.price,
        isAvailable: products.isAvailable,
        isVisible: products.isVisible,
        badges: products.badges,
        allergens: products.allergens,
        dietary: products.dietary,
        ...mediaColumns,
      })
      .from(products)
      .leftJoin(
        media,
        and(
          eq(media.restaurantId, products.restaurantId),
          eq(media.id, products.mediaId),
          isNull(media.deletedAt),
        ),
      )
      .where(
        and(
          eq(products.restaurantId, restaurantId),
          eq(products.id, productId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    return row ? toProduct(row) : null;
  });
}

function toProduct(row: {
  id: string;
  categoryId: string;
  slug: string;
  name: unknown;
  description: unknown;
  price: number;
  isAvailable: boolean;
  isVisible: boolean;
  badges: string[];
  allergens: string[];
  dietary: string[];
  mediaId: string | null;
  basePath: string | null;
  width: number | null;
  height: number | null;
  renditions: unknown;
  dominantColor: string | null;
}): EditorProduct {
  return {
    id: row.id,
    categoryId: row.categoryId,
    slug: row.slug,
    name: storedI18nSchema.parse(row.name),
    description: storedI18nSchema.parse(row.description),
    price: row.price,
    isAvailable: row.isAvailable,
    isVisible: row.isVisible,
    media: toMedia(row),
    badges: attributesSchema.badges.parse(row.badges),
    allergens: attributesSchema.allergens.parse(row.allergens),
    dietary: attributesSchema.dietary.parse(row.dietary),
  };
}

/** One image of the restaurant, for the form preview right after an upload (under RLS). */
export async function loadEditorMedia(
  claims: SessionClaims,
  restaurantId: string,
  mediaId: string,
): Promise<EditorMedia | null> {
  return withRls(claims, async (tx) => {
    const [row] = await tx
      .select(mediaColumns)
      .from(media)
      .where(
        and(eq(media.restaurantId, restaurantId), eq(media.id, mediaId), isNull(media.deletedAt)),
      )
      .limit(1);
    return row ? toMedia(row) : null;
  });
}

function parseSchedule(value: unknown): Schedule | null {
  if (value === null) return null;
  const parsed = scheduleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** A product's option links in display order, skipping deleted groups (under RLS). */
export async function loadProductOptionLinks(
  claims: SessionClaims,
  restaurantId: string,
  productId: string,
): Promise<EditorOptionLink[]> {
  return withRls(claims, async (tx) => {
    const rows = await tx
      .select({
        optionGroupId: productOptionGroups.optionGroupId,
        minSelect: productOptionGroups.minSelect,
        maxSelect: productOptionGroups.maxSelect,
        priceOverrides: productOptionGroups.priceOverrides,
      })
      .from(productOptionGroups)
      .innerJoin(
        optionGroups,
        and(
          eq(optionGroups.restaurantId, productOptionGroups.restaurantId),
          eq(optionGroups.id, productOptionGroups.optionGroupId),
          isNull(optionGroups.deletedAt),
        ),
      )
      .where(
        and(
          eq(productOptionGroups.restaurantId, restaurantId),
          eq(productOptionGroups.productId, productId),
        ),
      )
      .orderBy(asc(productOptionGroups.sortOrder));
    return rows.map((row) => ({
      optionGroupId: row.optionGroupId,
      minSelect: row.minSelect,
      maxSelect: row.maxSelect,
      priceOverrides: priceOverridesSchema.parse(row.priceOverrides),
    }));
  });
}

/** Reusable option groups with their options and how many products use them (under RLS). */
export async function loadOptionGroups(
  claims: SessionClaims,
  restaurantId: string,
): Promise<EditorOptionGroup[]> {
  return withRls(claims, async (tx) => {
    const groups = await tx
      .select({
        id: optionGroups.id,
        name: optionGroups.name,
        minSelect: optionGroups.minSelect,
        maxSelect: optionGroups.maxSelect,
      })
      .from(optionGroups)
      .where(and(eq(optionGroups.restaurantId, restaurantId), isNull(optionGroups.deletedAt)))
      .orderBy(asc(optionGroups.createdAt));
    if (groups.length === 0) return [];
    const ids = groups.map((group) => group.id);

    const optionRows = await tx
      .select({
        id: options.id,
        groupId: options.optionGroupId,
        name: options.name,
        priceDelta: options.priceDelta,
        isAvailable: options.isAvailable,
      })
      .from(options)
      .where(
        and(
          eq(options.restaurantId, restaurantId),
          inArray(options.optionGroupId, ids),
          isNull(options.deletedAt),
        ),
      )
      .orderBy(asc(options.sortOrder), asc(options.createdAt));

    const usageRows = await tx
      .select({ groupId: productOptionGroups.optionGroupId, value: count() })
      .from(productOptionGroups)
      .innerJoin(
        products,
        and(
          eq(products.restaurantId, productOptionGroups.restaurantId),
          eq(products.id, productOptionGroups.productId),
          isNull(products.deletedAt),
        ),
      )
      .where(
        and(
          eq(productOptionGroups.restaurantId, restaurantId),
          inArray(productOptionGroups.optionGroupId, ids),
        ),
      )
      .groupBy(productOptionGroups.optionGroupId);

    return groups.map((group) => ({
      id: group.id,
      name: storedI18nSchema.parse(group.name),
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      options: optionRows
        .filter((row) => row.groupId === group.id)
        .map((row) => ({
          id: row.id,
          name: storedI18nSchema.parse(row.name),
          priceDelta: row.priceDelta,
          isAvailable: row.isAvailable,
        })),
      usage: usageRows.find((row) => row.groupId === group.id)?.value ?? 0,
    }));
  });
}
