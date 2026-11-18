import type { MenuVariant } from './variants';

/**
 * Hard-coded slug → variant mapping for the sales demos. The authoritative value lives in
 * `restaurants.theme.variant`, written by the Super Admin install flow; this fallback lets the
 * public menu render each demo in its intended identity before — or in case — the DB is synced.
 *
 * Keep in sync with `src/server/admin/demo-venue.ts` (DEMO_VENUES).
 */
const DEMO_VARIANTS: Readonly<Record<string, MenuVariant>> = {
  'cafe-el-bahja': 'traditional',
  'cafe-marina': 'modern-minimal',
  'pizzeria-mediterranea': 'bistro',
  'trattoria-vesuvio': 'elegant-dark',
  'patisserie-la-rose': 'romantic-pastel',
  'patisserie-nordique': 'scandinavian',
  'bar-citadelle': 'dark-luxe',
  'rooftop-sidi-bou': 'mediterranean-airy',
  'tunis-grill': 'street-bold',
  'glacier-sorbetto': 'playful-pastel',
};

export function demoVariantForSlug(slug: string): MenuVariant | null {
  return DEMO_VARIANTS[slug] ?? null;
}
