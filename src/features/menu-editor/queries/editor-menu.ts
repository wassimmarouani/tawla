import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { categories, media, products } from '@/lib/db/schema/schema';
import type { MediaRenditions } from '@/lib/media/urls';
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
}

export interface EditorCategory {
  id: string;
  name: I18nText;
  isVisible: boolean;
  availability: Schedule | null;
  products: EditorProduct[];
}

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
