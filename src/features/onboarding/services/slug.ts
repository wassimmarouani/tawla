import { RESERVED_SLUGS, SLUG_PATTERN } from '@/lib/tenancy/reserved-slugs';
import type { VenueType } from '../schemas/venue';

const MAX_LENGTH = 40;

const LIGATURES: Readonly<Record<string, string>> = { œ: 'oe', æ: 'ae', ß: 'ss', ø: 'o', ł: 'l' };

/**
 * Latin slug of a venue name: accents removed, lowercase, words joined by hyphens, ≤ 40 chars.
 * Non-Latin scripts (Arabic) produce an empty string; callers fall back to the venue type.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[œæßøł]/g, (letter) => LIGATURES[letter] ?? letter)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '');
}

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
  const fromName = slugify(name);
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
