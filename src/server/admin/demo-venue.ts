import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import type { DbTransaction } from '@/lib/db/rls';
import {
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
 * Sales demo venue "Café El Bahja" in hosted environments (marketing home, ADR-0031 §4).
 * A Super Admin installs it once from the console; the menu comes from the same SQL file as the
 * local seed and the photos go through the real media pipeline, so the demo matches local.
 * Fixed ids: the shared menu file references them.
 */
export const DEMO_VENUE = {
  organizationId: 'a0000000-0000-4000-8000-000000000001',
  restaurantId: 'b0000000-0000-4000-8000-000000000001',
  slug: 'cafe-el-bahja',
  name: 'Café El Bahja',
  tables: 12,
} as const;

/** Shared with the local seed (`pnpm db:seed-media`). Credits: supabase/seed-media/ATTRIBUTION.md. */
export const DEMO_PHOTOS: Readonly<Record<string, { product: string } | { cover: true }>> = {
  'citronnade.jpg': { product: 'citronnade' },
  'crepe-chocolat.jpg': { product: 'crepe-chocolat' },
  'croissant.jpg': { product: 'croissant' },
  'fricasse.jpg': { product: 'fricasse' },
  'makroud.jpg': { product: 'makroudh' },
  'ojja.jpg': { product: 'ojja' },
  'cover-cafe-sidi-bou-said.jpg': { cover: true },
};

/** Traced into the deployment by `outputFileTracingIncludes` (next.config.ts). */
export const DEMO_MENU_FILE = 'supabase/seeds/10_menu_el_bahja.sql';
export const DEMO_MEDIA_DIR = 'supabase/seed-media';

/** Open every day so prospects always see a live menu. */
const DEMO_SCHEDULE = {
  weekly: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, ranges: [{ from: '07:00', to: '24:00' }] })),
  exceptions: [],
};

export type DemoVenueState = 'missing' | 'partial' | 'ready';

/** `partial`: the venue exists but its photos are not all attached (interrupted install). */
export async function demoVenueState(): Promise<DemoVenueState> {
  const [row] = await rawDb()
    .select({
      cover: restaurants.coverMediaId,
      missingPhotos: sql<number>`(select count(*)::int from public.products p where p.restaurant_id = ${DEMO_VENUE.restaurantId} and p.slug in (${sql.join(
        photoProductSlugs().map((slug) => sql`${slug}`),
        sql`, `,
      )}) and p.media_id is null)`,
    })
    .from(restaurants)
    .where(and(eq(restaurants.id, DEMO_VENUE.restaurantId), isNull(restaurants.deletedAt)));
  if (!row) return 'missing';
  return row.cover && row.missingPhotos === 0 ? 'ready' : 'partial';
}

function photoProductSlugs(): string[] {
  return Object.values(DEMO_PHOTOS).flatMap((target) =>
    'product' in target ? [target.product] : [],
  );
}

/** SQL statements of the shared demo menu file (one `insert` each, no parameters). */
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

/**
 * Creates the demo venue with the caller as owner (Basic plan, 12 tables), then attaches the
 * photos. Re-running it completes an interrupted install and never duplicates anything.
 */
export async function installDemoVenue(
  claims: SessionClaims | null,
  storage: StorageConfig = storageConfig(),
): Promise<{ created: boolean }> {
  const admin = requirePlatform(claims, true);
  const menu = splitStatements(await readFile(path.join(process.cwd(), DEMO_MENU_FILE), 'utf8'));
  const created = await rawDb().transaction((tx) => insertDemoVenue(tx, admin.sub, menu));
  await attachDemoPhotos(storage);
  return { created };
}

/** Database part of the install, in the caller's transaction. Returns false when present. */
export async function insertDemoVenue(
  tx: DbTransaction,
  ownerId: string,
  menu: readonly string[],
): Promise<boolean> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('demo-venue', 0))`);
  const [existing] = await tx
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(or(eq(restaurants.id, DEMO_VENUE.restaurantId), eq(restaurants.slug, DEMO_VENUE.slug)));
  if (existing) {
    if (existing.id === DEMO_VENUE.restaurantId) return false;
    throw new AppError('VALIDATION_FAILED', 'Demo slug already used', { reason: 'slug_taken' });
  }

  const [plan] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.code, 'basic'));
  if (!plan) throw new Error('Plan "basic" is missing');

  await tx
    .insert(organizations)
    .values({ id: DEMO_VENUE.organizationId, name: `${DEMO_VENUE.name} (démo)` });
  await tx.insert(restaurants).values({
    id: DEMO_VENUE.restaurantId,
    organizationId: DEMO_VENUE.organizationId,
    slug: DEMO_VENUE.slug,
    name: DEMO_VENUE.name,
    type: 'cafe',
    defaultLocale: 'fr',
    theme: { brand_color: '#b4532a' },
    openingSchedule: DEMO_SCHEDULE,
  });
  await tx
    .insert(memberships)
    .values({ restaurantId: DEMO_VENUE.restaurantId, userId: ownerId, role: 'owner' });
  await tx
    .insert(subscriptions)
    .values({ restaurantId: DEMO_VENUE.restaurantId, planId: plan.id, status: 'active' });
  for (const statement of menu) await tx.execute(sql.raw(statement));
  // Tokens come from the insert trigger, like any venue's tables.
  await tx.insert(tables).values(
    Array.from({ length: DEMO_VENUE.tables }, (_, index) => ({
      restaurantId: DEMO_VENUE.restaurantId,
      number: index + 1,
    })),
  );
  await writeAudit(
    {
      restaurantId: DEMO_VENUE.restaurantId,
      actorId: ownerId,
      action: 'platform.demo_install',
      entity: 'restaurant',
      entityId: DEMO_VENUE.restaurantId,
      diff: { slug: DEMO_VENUE.slug, plan: 'basic' },
    },
    tx,
  );
  return true;
}

/** Attaches each photo that is still missing (idempotent: same content, same media row). */
async function attachDemoPhotos(storage: StorageConfig): Promise<void> {
  const db = rawDb();
  const [venue] = await db
    .select({ cover: restaurants.coverMediaId })
    .from(restaurants)
    .where(eq(restaurants.id, DEMO_VENUE.restaurantId));
  if (!venue) return;
  const missing = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(eq(products.restaurantId, DEMO_VENUE.restaurantId), isNull(products.mediaId)))
    ).map((row) => row.slug),
  );

  for (const [file, target] of Object.entries(DEMO_PHOTOS)) {
    const needed = 'cover' in target ? venue.cover === null : missing.has(target.product);
    if (!needed) continue;
    const kind = 'cover' in target ? 'cover' : 'product';
    const source = await readFile(path.join(process.cwd(), DEMO_MEDIA_DIR, file));
    const mediaId = await storeProcessedImage(
      storage,
      DEMO_VENUE.restaurantId,
      kind,
      await processImage(source, kind),
    );
    if ('cover' in target) {
      await db
        .update(restaurants)
        .set({ coverMediaId: mediaId })
        .where(eq(restaurants.id, DEMO_VENUE.restaurantId));
    } else {
      await db
        .update(products)
        .set({ mediaId })
        .where(
          and(
            eq(products.restaurantId, DEMO_VENUE.restaurantId),
            eq(products.slug, target.product),
          ),
        );
    }
  }
}
