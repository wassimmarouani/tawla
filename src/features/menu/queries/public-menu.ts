import 'server-only';
import { sql } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import type { Locale } from '@/i18n/locales';
import { withRls } from '@/lib/db/rls';
import { log } from '@/lib/log';
import { demoPhotoForProduct } from '@/lib/menu/demo-photos';
import { publicMenuSchema, type PublicMenu } from '../schemas/public-menu';

/** Cache tags of a public menu (ADR-0017): editors revalidate both after every change. */
export function menuCacheTags(slug: string, publicId?: string): string[] {
  return publicId ? [`menu:slug:${slug}`, `menu:${publicId}`] : [`menu:slug:${slug}`];
}

/**
 * Public menu of a restaurant, resolved for `locale` (ADR-0017 §2): `get_public_menu` as the
 * anonymous role, validated with Zod, cached until a menu change revalidates its tags. Unknown
 * slugs are cached briefly so a newly published venue appears within minutes.
 */
export async function getPublicMenu(slug: string, locale: Locale): Promise<PublicMenu | null> {
  'use cache';
  const rows = await withRls({ role: 'anon' }, (tx) =>
    tx.execute<{ menu: unknown }>(sql`select public.get_public_menu(${slug}, ${locale}) as menu`),
  );
  const raw = rows[0]?.menu ?? null;
  if (raw === null) {
    cacheLife('minutes');
    cacheTag(...menuCacheTags(slug));
    return null;
  }

  const parsed = publicMenuSchema.safeParse(raw);
  if (!parsed.success) {
    log.error('menu.invalid_payload', { slug, issues: parsed.error.issues.length });
    throw new Error('Invalid public menu payload');
  }
  cacheLife('max');
  cacheTag(...menuCacheTags(slug, parsed.data.restaurant.public_id));
  return withDemoPhotos(parsed.data, slug);
}

/**
 * Seeded demo venues have no uploaded media yet. Inject a curated Unsplash URL for every
 * product that lacks one, keyed by the product's Latin slug, so the demo tiles show real food
 * photos instead of the first-grapheme placeholder.
 */
function withDemoPhotos(menu: PublicMenu, venueSlug: string): PublicMenu {
  return {
    ...menu,
    categories: menu.categories.map((category) => ({
      ...category,
      products: category.products.map((product) => {
        if (product.media !== null || product.photo_url) return product;
        const url = demoPhotoForProduct(venueSlug, product.slug);
        return url ? { ...product, photo_url: url } : product;
      }),
    })),
  };
}
