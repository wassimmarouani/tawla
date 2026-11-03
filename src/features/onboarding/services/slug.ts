import { RESERVED_SLUGS, SLUG_PATTERN } from '@/lib/tenancy/reserved-slugs';
import { slugify } from '@/lib/text/slugify';
import type { VenueType } from '../schemas/venue';

const MAX_LENGTH = 40;

export function isAvailableSlugShape(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

/**
 * Ordered slug candidates for a new venue (ADR-0012): the name itself, then the name with each
 * random suffix. Names without Latin letters use the venue type (`cafe`, `tea-room`…).
 * Pure: the caller supplies the suffixes and checks availability against the database.
 */
export function slugCandidates(
  name: string,
  type: VenueType,
  suffixes: readonly string[],
): string[] {
  const fromName = slugify(name, MAX_LENGTH);
  const base = fromName.length >= 3 ? fromName : type.replace('_', '-');
  const candidates = [
    base,
    ...suffixes.map((suffix) => {
      const head = base.slice(0, MAX_LENGTH - suffix.length - 1).replace(/-+$/, '');
      return `${head}-${suffix}`;
    }),
  ];
  return [...new Set(candidates)].filter(isAvailableSlugShape);
}
