import { LOCALES } from '@/i18n/locales';
import { APP_SEGMENTS, MARKETING_SEGMENTS, SYSTEM_SEGMENTS } from '../routing/resolve-route';

/** Restaurant slug format (ADR-0012): 3–40 chars, lowercase letters, digits, inner hyphens. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

const ADDITIONAL_RESERVED = [
  'app',
  'p',
  'help',
  'support',
  'status',
  'www',
  'mail',
  'static',
  'assets',
  'blog',
  'docs',
  'about',
  'contact',
  'terms',
  'privacy',
  'tawla',
  'menu',
  'ingest',
  'health',
  'robots',
  'sitemap',
  'favicon',
  'manifest',
  'sw',
] as const;

/**
 * Slugs a restaurant may never take: every routed first segment plus product words (ADR-0012).
 * Mirrored by the `reserved_slugs` table in the database.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set<string>([
  ...MARKETING_SEGMENTS.filter(Boolean),
  ...APP_SEGMENTS,
  ...SYSTEM_SEGMENTS,
  ...LOCALES,
  ...ADDITIONAL_RESERVED,
]);

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}
