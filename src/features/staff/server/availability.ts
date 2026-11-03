import 'server-only';
import { revalidateTag } from 'next/cache';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { menuCacheTags, pickTranslation } from '@/features/menu';
import type { Locale } from '@/i18n/locales';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { AppError } from '@/lib/errors';
import type { PairedDevice } from '@/server/admin/staff-access';

/**
 * Staff availability toggle (spec 03, Basic): every staff role may mark a product sold out.
 * Runs under the member's RLS; the write goes through public.set_product_availability.
 */

const i18nSchema = z.record(z.string(), z.string());

export interface AvailabilityItem {
  id: string;
  name: string;
  category: string;
  isAvailable: boolean;
}

export async function listAvailability(
  claims: SessionClaims,
  restaurantId: string,
  locale: Locale,
  fallback: Locale,
): Promise<AvailabilityItem[]> {
  const rows = await withRls(claims, (tx) =>
    tx.execute<{ id: string; name: unknown; category: unknown; is_available: boolean }>(sql`
      select p.id, p.name, c.name as category, p.is_available
      from public.products p
      join public.categories c on c.restaurant_id = p.restaurant_id and c.id = p.category_id
      where p.restaurant_id = ${restaurantId} and p.deleted_at is null and c.deleted_at is null
      order by c.sort_order, c.created_at, p.sort_order, p.created_at`),
  );
  const text = (value: unknown) => {
    const parsed = i18nSchema.safeParse(value);
    return parsed.success ? (pickTranslation(parsed.data, locale, fallback)?.text ?? '') : '';
  };
  return rows.map((row) => ({
    id: row.id,
    name: text(row.name),
    category: text(row.category),
    isAvailable: row.is_available,
  }));
}

export async function setAvailability(
  claims: SessionClaims,
  device: PairedDevice,
  productId: string,
  available: boolean,
): Promise<{ version: number }> {
  const [row] = await withRls(claims, (tx) =>
    tx
      .execute<{ version: number }>(
        sql`select public.set_product_availability(${productId}::uuid, ${available}) as version`,
      )
      .catch((error: unknown) => {
        if (String(error).includes('product not found')) {
          throw new AppError('NOT_FOUND', 'Product not found');
        }
        throw error;
      }),
  );
  if (!row) throw new AppError('NOT_FOUND', 'Product not found');
  // Customers' next refresh reads the new state (ADR-0017 tags; the m: event arrives first).
  for (const tag of menuCacheTags(device.restaurantSlug, device.restaurantPublicId))
    revalidateTag(tag, { expire: 0 });
  return { version: row.version };
}
