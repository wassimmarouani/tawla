import 'server-only';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { categories, memberships, products, restaurants, tables } from '@/lib/db/schema/schema';
import { restaurantThemeSchema } from '@/features/menu';
import type { ChecklistFacts } from '../services/checklist';

export interface OverviewFacts extends ChecklistFacts {
  categories: number;
}

/** Counts behind the overview page and its checklist, read under the user's RLS. */
export async function loadOverviewFacts(
  claims: SessionClaims,
  restaurantId: string,
): Promise<OverviewFacts> {
  return withRls(claims, async (tx) => {
    const [productRow] = await tx
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.restaurantId, restaurantId), isNull(products.deletedAt)));
    const [categoryRow] = await tx
      .select({ value: count() })
      .from(categories)
      .where(and(eq(categories.restaurantId, restaurantId), isNull(categories.deletedAt)));
    const [memberRow] = await tx
      .select({ value: count() })
      .from(memberships)
      .where(and(eq(memberships.restaurantId, restaurantId), eq(memberships.isActive, true)));
    const [tableRow] = await tx
      .select({ value: count() })
      .from(tables)
      .where(and(eq(tables.restaurantId, restaurantId), isNull(tables.deletedAt)));
    const [restaurant] = await tx
      .select({ theme: restaurants.theme, logo: restaurants.logoMediaId })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    return {
      products: productRow?.value ?? 0,
      categories: categoryRow?.value ?? 0,
      members: memberRow?.value ?? 0,
      branded:
        Boolean(restaurant?.logo) ||
        restaurantThemeSchema.parse(restaurant?.theme).brand_color !== undefined,
      tables: tableRow?.value ?? 0,
    };
  });
}
