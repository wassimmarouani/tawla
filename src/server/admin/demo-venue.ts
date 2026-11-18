import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { findTemplate, templateI18n, type MenuTemplate } from '@/lib/menu/templates';
import { variantPrefersDark, type MenuVariant } from '@/lib/menu/variants';
import { slugify } from '@/lib/text/slugify';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import type { DbTransaction } from '@/lib/db/rls';
import {
  categories,
  memberships,
  organizations,
  plans,
  products,
  restaurants,
  subscriptions,
  tables,
} from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import { writeAudit } from './audit';
import { storageConfig } from './env';
import { processImage } from './media/process-image';
import { storeProcessedImage, type StorageConfig } from './media/storage';
import { requirePlatform } from './platform';

/**
 * Sales demo venues (marketing home + /venues directory). The first one — Café El Bahja — has
 * real photos; the others install their menu from one of the menu-editor templates with no
 * photos. A Super Admin installs or completes them in one click from /admin. Fixed ids so links
 * and the menu SQL file for the café match local.
 */

export interface DemoVenueDefinition {
  organizationId: string;
  restaurantId: string;
  slug: string;
  name: string;
  type: 'cafe' | 'restaurant' | 'tea_room' | 'pastry' | 'fast_food';
  /** Sub-category label shown on the marketing card (for filter chips and hover text). */
  segment: 'cafe' | 'italian' | 'pastry' | 'bar' | 'street' | 'glacier';
  /** FR headline shown under the venue name on the landing card. Kept short (max ~80 chars). */
  taglineFr: string;
  taglineAr: string;
  taglineEn: string;
  brandColor: `#${string}`;
  /** Public menu visual variant (fonts, radius, accents). See `src/lib/menu/variants.ts`. */
  variant: MenuVariant;
  tables: number;
  /** Menu source: the El Bahja SQL seed file (photographed), or a template id. */
  menu: { kind: 'sql'; file: string } | { kind: 'template'; id: string };
  /** Optional photos (only Café El Bahja has them today). */
  photos?: Readonly<Record<string, { product: string } | { cover: true }>>;
  /**
   * Hotlinkable cover image used by the landing demo card (and the public menu header through
   * `settings.cover_url`). Unsplash CDN URLs: licensed for free hotlinking (unsplash.com/license),
   * served from a global CDN with `&auto=format&q=80` to keep bytes low.
   */
  coverImageUrl?: string;
}

const CAFE_EL_BAHJA: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000001',
  restaurantId: 'b0000000-0000-4000-8000-000000000001',
  slug: 'cafe-el-bahja',
  name: 'Café El Bahja',
  type: 'cafe',
  segment: 'cafe',
  taglineFr: 'Café traditionnel tunisien, thé à la menthe et pâtisseries',
  taglineAr: 'مقهى تونسي تقليدي، شاي بالنعناع وحلويات',
  taglineEn: 'Traditional Tunisian café, mint tea and pastries',
  brandColor: '#b4532a',
  variant: 'traditional',
  tables: 12,
  menu: { kind: 'sql', file: 'supabase/seeds/10_menu_el_bahja.sql' },
  photos: {
    'citronnade.jpg': { product: 'citronnade' },
    'crepe-chocolat.jpg': { product: 'crepe-chocolat' },
    'croissant.jpg': { product: 'croissant' },
    'fricasse.jpg': { product: 'fricasse' },
    'makroud.jpg': { product: 'makroudh' },
    'ojja.jpg': { product: 'ojja' },
    'cover-cafe-sidi-bou-said.jpg': { cover: true },
  },
};

const CAFE_MARINA: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000011',
  restaurantId: 'b0000000-0000-4000-8000-000000000011',
  slug: 'cafe-marina',
  name: 'Café Marina',
  type: 'cafe',
  segment: 'cafe',
  taglineFr: 'Coffee shop moderne : specialty, smoothies et bowls',
  taglineAr: 'كوفي شوب عصري: قهوة مختصة، سموذي وبولز',
  taglineEn: 'Modern coffee shop: specialty coffee, smoothies and bowls',
  brandColor: '#0f766e',
  variant: 'modern-minimal',
  tables: 10,
  menu: { kind: 'template', id: 'cafe-modern' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
};

const PIZZERIA_MEDITERRANEA: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000003',
  restaurantId: 'b0000000-0000-4000-8000-000000000003',
  slug: 'pizzeria-mediterranea',
  name: 'Pizzeria Mediterranea',
  type: 'restaurant',
  segment: 'italian',
  taglineFr: 'Pizzas au feu de bois, pâtes fraîches et salades',
  taglineAr: 'بيتزا بالحطب، معكرونة طازجة وسلطات',
  taglineEn: 'Wood-fired pizzas, fresh pasta and salads',
  brandColor: '#1f7a4d',
  variant: 'bistro',
  tables: 8,
  menu: { kind: 'template', id: 'pizzeria' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
};

const TRATTORIA_VESUVIO: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000012',
  restaurantId: 'b0000000-0000-4000-8000-000000000012',
  slug: 'trattoria-vesuvio',
  name: 'Trattoria Vesuvio',
  type: 'restaurant',
  segment: 'italian',
  taglineFr: 'Trattoria italienne haut de gamme, carte des vins',
  taglineAr: 'تراتوريا إيطالية راقية، قائمة نبيذ',
  taglineEn: 'Upscale Italian trattoria with wine list',
  brandColor: '#7c2d12',
  variant: 'elegant-dark',
  tables: 14,
  menu: { kind: 'template', id: 'trattoria' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=1200&auto=format&fit=crop&q=80',
};

const PATISSERIE_LA_ROSE: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000004',
  restaurantId: 'b0000000-0000-4000-8000-000000000004',
  slug: 'patisserie-la-rose',
  name: 'Pâtisserie La Rose',
  type: 'pastry',
  segment: 'pastry',
  taglineFr: 'Pâtisserie tunisienne, viennoiseries et salon de thé',
  taglineAr: 'حلويات تونسية، معجنات وصالون شاي',
  taglineEn: 'Tunisian pastry, viennoiseries and tea room',
  brandColor: '#c2185b',
  variant: 'romantic-pastel',
  tables: 6,
  menu: { kind: 'template', id: 'patisserie' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1200&auto=format&fit=crop&q=80',
};

const PATISSERIE_NORDIQUE: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000013',
  restaurantId: 'b0000000-0000-4000-8000-000000000013',
  slug: 'patisserie-nordique',
  name: 'Pâtisserie Nordique',
  type: 'pastry',
  segment: 'pastry',
  taglineFr: 'Entremets signature, croissants au beurre AOP',
  taglineAr: 'كيك مميّز، كرواسون بزبدة AOP',
  taglineEn: 'Signature layered cakes, AOP butter croissants',
  brandColor: '#1e40af',
  variant: 'scandinavian',
  tables: 5,
  menu: { kind: 'template', id: 'patisserie-modern' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=1200&auto=format&fit=crop&q=80',
};

const BAR_CITADELLE: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000014',
  restaurantId: 'b0000000-0000-4000-8000-000000000014',
  slug: 'bar-citadelle',
  name: 'Bar Citadelle',
  type: 'restaurant',
  segment: 'bar',
  taglineFr: 'Bar à cocktails signature, planches à partager',
  taglineAr: 'بار كوكتيل مميّز وطاولات للمشاركة',
  taglineEn: 'Signature cocktail bar and sharing boards',
  brandColor: '#111827',
  variant: 'dark-luxe',
  tables: 14,
  menu: { kind: 'template', id: 'bar-cocktail' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200&auto=format&fit=crop&q=80',
};

const ROOFTOP_SIDI_BOU: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000015',
  restaurantId: 'b0000000-0000-4000-8000-000000000015',
  slug: 'rooftop-sidi-bou',
  name: 'Rooftop Sidi Bou',
  type: 'restaurant',
  segment: 'bar',
  taglineFr: 'Terrasse panoramique, cocktails et mezze méditerranéens',
  taglineAr: 'تراس بانورامي، كوكتيل ومزّة متوسطية',
  taglineEn: 'Panoramic rooftop, cocktails and Mediterranean mezze',
  brandColor: '#1d4ed8',
  variant: 'mediterranean-airy',
  tables: 20,
  menu: { kind: 'template', id: 'bar-cocktail' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
};

const TUNIS_GRILL: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000016',
  restaurantId: 'b0000000-0000-4000-8000-000000000016',
  slug: 'tunis-grill',
  name: 'Tunis Grill',
  type: 'fast_food',
  segment: 'street',
  taglineFr: 'Street food & grill : sandwichs, brochettes, frites',
  taglineAr: 'ستريت فود وغريل: سندويتشات، شياش، بطاطا',
  taglineEn: 'Street food & grill: sandwiches, skewers, fries',
  brandColor: '#ea580c',
  variant: 'street-bold',
  tables: 10,
  menu: { kind: 'template', id: 'street-food' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&auto=format&fit=crop&q=80',
};

const GLACIER_SORBETTO: DemoVenueDefinition = {
  organizationId: 'a0000000-0000-4000-8000-000000000017',
  restaurantId: 'b0000000-0000-4000-8000-000000000017',
  slug: 'glacier-sorbetto',
  name: 'Glacier Sorbetto',
  type: 'pastry',
  segment: 'glacier',
  taglineFr: 'Glaces artisanales, gaufres et sundaes',
  taglineAr: 'مثلجات حرفية، غوفر وسَنداي',
  taglineEn: 'Artisan ice cream, waffles and sundaes',
  brandColor: '#db2777',
  variant: 'playful-pastel',
  tables: 8,
  menu: { kind: 'template', id: 'glacier' },
  coverImageUrl:
    'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=1200&auto=format&fit=crop&q=80',
};

/** Ordered list; the landing shows them in this order too. */
export const DEMO_VENUES: readonly DemoVenueDefinition[] = [
  CAFE_EL_BAHJA,
  CAFE_MARINA,
  PIZZERIA_MEDITERRANEA,
  TRATTORIA_VESUVIO,
  PATISSERIE_LA_ROSE,
  PATISSERIE_NORDIQUE,
  BAR_CITADELLE,
  ROOFTOP_SIDI_BOU,
  TUNIS_GRILL,
  GLACIER_SORBETTO,
];

/** Kept for existing callers (DEMO_MENU_SLUG wiring, tests): the primary demo venue. */
export const DEMO_VENUE = CAFE_EL_BAHJA;

/** Traced into the deployment by `outputFileTracingIncludes` (next.config.ts). */
export const DEMO_MENU_FILE = CAFE_EL_BAHJA.menu.kind === 'sql' ? CAFE_EL_BAHJA.menu.file : '';
export const DEMO_MEDIA_DIR = 'supabase/seed-media';

/** Open every day so prospects always see a live menu. */
const DEMO_SCHEDULE = {
  weekly: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, ranges: [{ from: '07:00', to: '24:00' }] })),
  exceptions: [],
};

export type DemoVenueState = 'missing' | 'partial' | 'ready';

/**
 * Aggregates the install state across every demo venue in a single raw SQL round-trip.
 *
 * The earlier Drizzle version used `inArray(restaurants.id, [...uuids])` + a correlated subquery
 * for the product count; in CI that returned zero rows (parameter placeholder count mismatch
 * when Drizzle serialises the array into `$1, $2, …` while the subquery also captures
 * `restaurants.id`), so the admin page reported 'missing' even when El Bahja was seeded.
 */
export async function demoVenueState(): Promise<DemoVenueState> {
  const ids = DEMO_VENUES.map((definition) => definition.restaurantId);
  const rows = await rawDb().execute<{
    id: string;
    cover: string | null;
    products_count: number;
  }>(sql`
    select
      r.id,
      r.cover_media_id as cover,
      coalesce((select count(*)::int from public.products p
        where p.restaurant_id = r.id and p.deleted_at is null), 0) as products_count
    from public.restaurants r
    where r.deleted_at is null
      and r.id = any (${sql`array[${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )}]::uuid[]`})
  `);

  const byId = new Map(rows.map((row) => [row.id, row]));
  let ready = 0;
  let missing = 0;
  for (const definition of DEMO_VENUES) {
    const row = byId.get(definition.restaurantId);
    if (!row || row.products_count === 0) {
      missing += 1;
      continue;
    }
    if (definition.photos && !row.cover) continue;
    ready += 1;
  }
  if (ready === DEMO_VENUES.length) return 'ready';
  if (missing === DEMO_VENUES.length) return 'missing';
  return 'partial';
}

/** SQL statements of the shared El Bahja menu file (one `insert` each, no parameters). */
export function splitStatements(script: string): string[] {
  return script
    .split(/;\s*$/m)
    .map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((statement) => statement.length > 0);
}

/** Installs or completes every demo venue. Idempotent: never duplicates and never crashes. */
export async function installDemoVenue(
  claims: SessionClaims | null,
  storage: StorageConfig = storageConfig(),
): Promise<{ created: number }> {
  const admin = requirePlatform(claims, true);
  let createdCount = 0;
  for (const definition of DEMO_VENUES) {
    const menu = await loadMenuStatements(definition);
    const created = await rawDb().transaction((tx) =>
      insertDemoVenue(tx, admin.sub, menu, definition),
    );
    if (created) createdCount += 1;
    // Always sync the theme so re-running the install picks up new variant / cover changes.
    await syncDemoTheme(definition);
    if (definition.photos) await attachDemoPhotos(storage, definition);
  }
  return { created: createdCount };
}

/** Writes the latest theme (brand color, variant, color mode) for a demo even after creation. */
async function syncDemoTheme(definition: DemoVenueDefinition): Promise<void> {
  await rawDb()
    .update(restaurants)
    .set({
      theme: {
        brand_color: definition.brandColor,
        variant: definition.variant,
        color_mode: variantPrefersDark(definition.variant) ? 'dark' : 'auto',
      },
    })
    .where(eq(restaurants.id, definition.restaurantId));
}

async function loadMenuStatements(definition: DemoVenueDefinition): Promise<readonly string[]> {
  if (definition.menu.kind === 'sql') {
    return splitStatements(await readFile(path.join(process.cwd(), definition.menu.file), 'utf8'));
  }
  return [];
}

/**
 * Database part of the install, in the caller's transaction. Returns false when present.
 * For SQL-sourced menus (El Bahja) the pre-split statements are executed verbatim; for template
 * menus we insert categories and products from the template definition.
 */
export async function insertDemoVenue(
  tx: DbTransaction,
  ownerId: string,
  sqlStatements: readonly string[],
  definition: DemoVenueDefinition = CAFE_EL_BAHJA,
): Promise<boolean> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`demo-venue:${definition.slug}`}, 0))`,
  );
  const [existing] = await tx
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(or(eq(restaurants.id, definition.restaurantId), eq(restaurants.slug, definition.slug)));
  if (existing) {
    if (existing.id === definition.restaurantId) return false;
    throw new AppError('VALIDATION_FAILED', 'Demo slug already used', { reason: 'slug_taken' });
  }

  const [plan] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.code, 'basic'));
  if (!plan) throw new Error('Plan "basic" is missing');

  const [existingOrg] = await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, definition.organizationId));
  if (!existingOrg) {
    await tx
      .insert(organizations)
      .values({ id: definition.organizationId, name: `${definition.name} (démo)` });
  }
  await tx.insert(restaurants).values({
    id: definition.restaurantId,
    organizationId: definition.organizationId,
    slug: definition.slug,
    name: definition.name,
    type: definition.type,
    defaultLocale: 'fr',
    theme: {
      brand_color: definition.brandColor,
      variant: definition.variant,
      color_mode: variantPrefersDark(definition.variant) ? 'dark' : 'auto',
    },
    openingSchedule: DEMO_SCHEDULE,
  });
  await tx
    .insert(memberships)
    .values({ restaurantId: definition.restaurantId, userId: ownerId, role: 'owner' });
  await tx
    .insert(subscriptions)
    .values({ restaurantId: definition.restaurantId, planId: plan.id, status: 'active' });

  if (definition.menu.kind === 'sql') {
    for (const statement of sqlStatements) await tx.execute(sql.raw(statement));
  } else {
    const template = findTemplate(definition.menu.id);
    if (!template) throw new Error(`Template "${definition.menu.id}" missing`);
    await insertTemplate(tx, definition.restaurantId, template);
  }

  // Tokens come from the insert trigger, like any venue's tables.
  await tx.insert(tables).values(
    Array.from({ length: definition.tables }, (_, index) => ({
      restaurantId: definition.restaurantId,
      number: index + 1,
    })),
  );

  await writeAudit(
    {
      restaurantId: definition.restaurantId,
      actorId: ownerId,
      action: 'platform.demo_install',
      entity: 'restaurant',
      entityId: definition.restaurantId,
      diff: { slug: definition.slug, plan: 'basic', source: definition.menu.kind },
    },
    tx,
  );
  return true;
}

const ORDER_STEP = 10;

/** Inserts a menu template's categories and products into the given demo venue. */
async function insertTemplate(
  tx: DbTransaction,
  restaurantId: string,
  template: MenuTemplate,
): Promise<void> {
  const taken = new Set<string>();
  let categoryOrder = 0;
  for (const category of template.categories) {
    categoryOrder += ORDER_STEP;
    const [row] = await tx
      .insert(categories)
      .values({
        restaurantId,
        name: templateI18n(category.name),
        sortOrder: categoryOrder,
      })
      .returning({ id: categories.id });
    if (!row) continue;
    let productOrder = 0;
    for (const product of category.products) {
      const name = templateI18n(product.name);
      const slug = uniqueSlug(slugify(product.name.fr || product.name.en || 'item', 80), taken);
      taken.add(slug);
      productOrder += ORDER_STEP;
      await tx.insert(products).values({
        restaurantId,
        categoryId: row.id,
        slug,
        name,
        description: product.description ? templateI18n(product.description) : {},
        price: product.price,
        sortOrder: productOrder,
      });
    }
  }
}

/** Attaches each photo of a definition that is still missing. Idempotent (content hash). */
async function attachDemoPhotos(
  storage: StorageConfig,
  definition: DemoVenueDefinition,
): Promise<void> {
  if (!definition.photos) return;
  const db = rawDb();
  const [venue] = await db
    .select({ cover: restaurants.coverMediaId })
    .from(restaurants)
    .where(eq(restaurants.id, definition.restaurantId));
  if (!venue) return;
  const missing = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(eq(products.restaurantId, definition.restaurantId), isNull(products.mediaId)))
    ).map((row) => row.slug),
  );

  for (const [file, target] of Object.entries(definition.photos)) {
    const needed = 'cover' in target ? venue.cover === null : missing.has(target.product);
    if (!needed) continue;
    const kind = 'cover' in target ? 'cover' : 'product';
    const source = await readFile(path.join(process.cwd(), DEMO_MEDIA_DIR, file));
    const mediaId = await storeProcessedImage(
      storage,
      definition.restaurantId,
      kind,
      await processImage(source, kind),
    );
    if ('cover' in target) {
      await db
        .update(restaurants)
        .set({ coverMediaId: mediaId })
        .where(eq(restaurants.id, definition.restaurantId));
    } else {
      await db
        .update(products)
        .set({ mediaId })
        .where(
          and(
            eq(products.restaurantId, definition.restaurantId),
            eq(products.slug, target.product),
          ),
        );
    }
  }
}

/** Returns `base` unchanged when free, otherwise `base-2`, `base-3`, … like productSlug. */
function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const start = base.length > 0 ? base : 'item';
  if (!taken.has(start)) return start;
  for (let suffix = 2; ; suffix += 1) {
    const tail = `-${String(suffix)}`;
    const candidate = `${start.slice(0, 80 - tail.length).replace(/-+$/, '')}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
}
