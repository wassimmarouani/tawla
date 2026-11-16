import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { rawDb } from '@/lib/db/client';
import { restaurants } from '@/lib/db/schema/schema';
import { DEMO_VENUES, type DemoVenueDefinition } from '@/server/admin/demo-venue';

export const DEMOS_CACHE_TAG = 'demos';

/** Shape for the "Live demos" landing section. */
export interface LandingDemo {
  slug: string;
  name: string;
  type: 'cafe' | 'restaurant' | 'tea_room' | 'pastry' | 'fast_food';
  segment: DemoVenueDefinition['segment'];
  brandColor: string;
  productCount: number;
  categoryCount: number;
  taglineFr: string;
  taglineAr: string;
  taglineEn: string;
}

/** Demo venues that are installed and have a menu — safe to render on the public landing. */
export async function landingDemos(): Promise<readonly LandingDemo[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(DEMOS_CACHE_TAG);

  const definitions = DEMO_VENUES;
  const rows = await rawDb()
    .select({
      id: restaurants.id,
      slug: restaurants.slug,
      name: restaurants.name,
      type: restaurants.type,
      theme: restaurants.theme,
      productCount: sql<number>`(select count(*)::int from public.products p where p.restaurant_id = ${restaurants.id} and p.deleted_at is null)`,
      categoryCount: sql<number>`(select count(*)::int from public.categories c where c.restaurant_id = ${restaurants.id} and c.deleted_at is null)`,
    })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.status, 'active'),
        isNull(restaurants.deletedAt),
        inArray(
          restaurants.id,
          definitions.map((definition) => definition.restaurantId),
        ),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return definitions.flatMap((definition) => {
    const row = byId.get(definition.restaurantId);
    if (!row || row.productCount === 0) return [];
    const theme = row.theme as { brand_color?: string } | null;
    return [
      {
        slug: row.slug,
        name: row.name,
        type: row.type,
        segment: definition.segment,
        brandColor: theme?.brand_color ?? definition.brandColor,
        productCount: row.productCount,
        categoryCount: row.categoryCount,
        taglineFr: definition.taglineFr,
        taglineAr: definition.taglineAr,
        taglineEn: definition.taglineEn,
      },
    ];
  });
}
