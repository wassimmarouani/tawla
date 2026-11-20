/**
 * Demo-only product photos. Verified Unsplash URLs grouped by genre and mapped from a product's
 * Latin slug, so a demo tile can show a real food photo instead of the first-grapheme placeholder.
 * The public menu loader injects `photo_url` for products that have no uploaded media — a
 * lightweight fallback that keeps the DB pristine (no media rows, no Storage uploads).
 *
 * Correctness over coverage (spec 6.4): a slug is given a photo only when the genre match is
 * confident. Anything uncertain — teas, juices, water, beer, smoothies, bowls, plain plates —
 * falls through to `null`, so the menu shows its intentional typographic variant rather than a
 * wrong image (a mint tea must never wear a coffee cup, water an ice-cream coupe, a beer a
 * cocktail). Every genre photo here actually depicts that genre; scene/interior shots are not used.
 */

const COFFEE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80';
const PIZZA =
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80';
const PASTA =
  'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800&auto=format&fit=crop&q=80';
const PATISSERIE =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80';
const SCANDI_PASTRY =
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&auto=format&fit=crop&q=80';
const COCKTAIL =
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&auto=format&fit=crop&q=80';
const GRILL =
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80';
const ICE_CREAM =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80';

/** The slugs the install script assigns to the 10 seeded demo venues (DEMO_VENUES). */
const DEMO_SLUGS = new Set([
  'cafe-el-bahja',
  'cafe-marina',
  'pizzeria-mediterranea',
  'trattoria-vesuvio',
  'patisserie-la-rose',
  'patisserie-nordique',
  'bar-citadelle',
  'rooftop-sidi-bou',
  'tunis-grill',
  'glacier-sorbetto',
]);

/**
 * Keyword → URL, first hit wins. Confident genre matches only; order the specific ones first.
 * Drinks that have no faithful photo (teas, juices, water, soda, beer, smoothies, matcha) are
 * intentionally absent so they fall through to `null`.
 */
const RULES: readonly (readonly [RegExp, string])[] = [
  // Cocktails and mocktails — a cocktail glass. Beer / wine deliberately excluded.
  [
    /mojito|negroni|old-fashioned|spritz|aperol|margarita|carthage|sidi-bou|medina-negroni|sunset|breeze|cocktail|virgin|pink-lady|ginger-lemon|fizz/,
    COCKTAIL,
  ],
  // Pizzas.
  [/pizza|margherita|napolitaine|napoletana|quatre-fromages|vegetarienne/, PIZZA],
  // Pasta and Italian antipasti / mains.
  [
    /pates|penne|spaghetti|lasagne|tagliatelle|ravioli|linguine|risotto|saltimbocca|osso-buco|carpaccio|burrata|antipasti|bruschetta/,
    PASTA,
  ],
  // Scandinavian / modern patisserie signatures.
  [
    /cruffin|kouign|cinnamon|cardamom|skolebrod|wienerbrod|entremets|framboise|caramel-noisette|yuzu/,
    SCANDI_PASTRY,
  ],
  // French / Tunisian pastry, viennoiserie and cakes by the slice.
  [
    /baklawa|makroudh|bambalouni|zlabia|kaak|tarte|fondant|cheesecake|carrot-cake|eclair|opera|mille-feuille|tiramisu|panna|chausson|croissant|pain-chocolat|pain-au-chocolat|viennoiserie|cookie|gateau|chocolat-noir|dame-blanche/,
    PATISSERIE,
  ],
  // Glaces, sundaes, gaufres, crêpes, milkshakes — an ice-cream coupe.
  [/glace|coupe|sundae|gaufre|crepe|affogato|sorbet|milkshake|liegeois/, ICE_CREAM],
  // Hot coffee drinks only (not teas, not hot chocolate).
  [
    /express|espresso|ristretto|cafe-turc|turc|cappuccino|capucin|flat-white|cold-brew|mocha|latte|americano|direct/,
    COFFEE,
  ],
  // Grills, sandwiches and savoury Tunisian plates.
  [
    /grillade|merguez|brochette|escalope|mixed-grill|makloub|chapati|sandwich|fricasse|frites|nachos|cheddar|cesar|salade|mechouia|olives|fromage|lablabi|brik|omelette|tartine|ojja|burger|combo/,
    GRILL,
  ],
];

/**
 * Returns a demo product photo URL for a known demo venue when the genre is confident, otherwise
 * `null` — for other venues (owner uploads their own media) and for any slug without a faithful
 * match, so the menu renders its typographic no-photo variant instead of a wrong image.
 */
export function demoPhotoForProduct(venueSlug: string, productSlug: string): string | null {
  if (!DEMO_SLUGS.has(venueSlug)) return null;
  const slug = productSlug.toLowerCase();
  for (const [re, url] of RULES) if (re.test(slug)) return url;
  return null;
}
