/**
 * Demo-only product photos. A small, curated allowlist of a venue's *signature* items, each mapped
 * to a verified Unsplash URL that genuinely depicts that dish. The public menu loader injects
 * `photo_url` for these hero products only; every other product falls through to `null` and shows
 * its intentional typographic (first-grapheme) variant. This keeps the DB pristine (no media rows,
 * no Storage uploads) while matching the "a few real hero photos, the rest typographic" look of the
 * photographed Café El Bahja seed.
 *
 * Correctness over coverage (spec 6.4): a product gets a photo only when a verified image of that
 * exact genre exists. Genres without a faithful photo (cocktails, fresh pasta, Nordic entremets,
 * teas, juices, water, beer) are left out entirely, so a menu never shows a wrong image — a mint
 * tea must never wear a coffee cup, a cocktail a doughnut. Every URL here depicts its dish; scene
 * and interior shots are never used.
 */

const COFFEE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80';
const PIZZA =
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80';
const PATISSERIE =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80';
const GRILL =
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80';
const ICE_CREAM =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80';

/**
 * `venueSlug → { productSlug → url }`. Only signature items appear, and within one venue each hero
 * uses a distinct image, so no photo is ever repeated. Café El Bahja is omitted: it has real
 * uploaded media (seed-media). Bar Citadelle, Rooftop Sidi Bou and Trattoria Vesuvio are omitted on
 * purpose — their signatures (cocktails, fresh pasta) have no faithful stock image, so they render
 * fully typographic, which suits their dark / serif identities.
 */
const HEROES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'cafe-marina': { 'flat-white': COFFEE, 'cookie-choco-noisette': PATISSERIE },
  'pizzeria-mediterranea': { margherita: PIZZA },
  'patisserie-la-rose': { cappuccino: COFFEE },
  'patisserie-nordique': { cappuccino: COFFEE },
  'tunis-grill': { 'mixed-grill': GRILL },
  'glacier-sorbetto': { 'coupe-3-boules': ICE_CREAM },
};

/**
 * Returns a demo product photo URL for a signature item of a known demo venue, otherwise `null`
 * (for owner-managed venues and for every non-hero product), so the menu renders its typographic
 * no-photo variant instead of a wrong or repeated image.
 */
export function demoPhotoForProduct(venueSlug: string, productSlug: string): string | null {
  return HEROES[venueSlug]?.[productSlug.toLowerCase()] ?? null;
}
