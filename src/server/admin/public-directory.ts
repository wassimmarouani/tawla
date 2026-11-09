import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { rawDb } from '@/lib/db/client';
import { restaurants } from '@/lib/db/schema/schema';

/** Rows the public /venues directory page renders, one per listed active venue. */
export interface DirectoryVenue {
  slug: string;
  name: string;
  type: string;
  address: string | null;
}

/** Cache tag updated when a venue toggles its directory setting (not wired yet; manual revalidate). */
export const DIRECTORY_CACHE_TAG = 'directory';

/**
 * Venues that opted into the public directory, grouped later by type on the page. Reads a jsonb
 * flag from `settings.listed` (defaults to true), excludes soft-deleted and non-active statuses.
 */
export async function listPublicVenues(): Promise<readonly DirectoryVenue[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(DIRECTORY_CACHE_TAG);

  const rows = await rawDb()
    .select({
      slug: restaurants.slug,
      name: restaurants.name,
      type: restaurants.type,
      address: sql<string | null>`${restaurants.settings} ->> 'address'`,
    })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.status, 'active'),
        isNull(restaurants.deletedAt),
        sql`coalesce((${restaurants.settings} ->> 'listed')::boolean, true)`,
      ),
    )
    .orderBy(asc(restaurants.name));

  return rows;
}
