import type { MenuVariant } from './variants';

/**
 * Hard-coded slug → variant mapping for the sales demos. The authoritative value lives in
 * `restaurants.theme.variant`, written by the Super Admin install flow; this fallback lets the
 * public menu render each demo in its intended identity before — or in case — the DB is synced.
 *
 * Keep in sync with `src/server/admin/demo-venue.ts` (DEMO_VENUES).
 */
const DEMO_VARIANTS: Readonly<Record<string, MenuVariant>> = {
  'cafe-el-bahja': 'medina',
  'patisserie-la-rose': 'medina',
  'cafe-marina': 'specialty',
  'pizzeria-mediterranea': 'trattoria',
  'trattoria-vesuvio': 'trattoria',
  'patisserie-nordique': 'atelier',
  'bar-citadelle': 'nocturne',
  'rooftop-sidi-bou': 'nocturne',
  'tunis-grill': 'street',
  'glacier-sorbetto': 'gelato',
};

export function demoVariantForSlug(slug: string): MenuVariant | null {
  return DEMO_VARIANTS[slug] ?? null;
}
