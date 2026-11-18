/**
 * Demo-only product photos. Verified Unsplash URLs (same ones that back the DEMO_VENUES cover
 * images) grouped by genre and mapped from a product's Latin slug, so every demo tile shows a
 * real food photo instead of the first-grapheme placeholder. The public menu loader injects
 * `photo_url` for products that have no uploaded media — a lightweight fallback that keeps the
 * DB pristine (no media rows, no Storage uploads) while the owner is trying the product.
 */

const COFFEE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80';
const COFFEE_BAR =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80';
const PIZZA =
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80';
const TRATTORIA =
  'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800&auto=format&fit=crop&q=80';
const PATISSERIE =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80';
const SCANDI_PASTRY =
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&auto=format&fit=crop&q=80';
const BAR =
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&auto=format&fit=crop&q=80';
const ROOFTOP =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80';
const GRILL =
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80';
const ICE_CREAM =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80';
const CAFE_MODERN =
  'https://images.unsplash.com/photo-1455853828816-0c301a011711?w=800&auto=format&fit=crop&q=80';

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

/** Keyword → URL. First hit wins, so order the specific ones before generic falls-through. */
const RULES: readonly (readonly [RegExp, string])[] = [
  // Cocktails, wines, beers — bar aesthetic.
  [
    /mojito|negroni|old-fashioned|spritz|aperol|margarita-cocktail|medina|sidi-bou|carthage|sunset|breeze|cocktail/,
    BAR,
  ],
  [/prosecco|chianti|wine|vin|biere|bieres|celtia/, BAR],
  // Fresh/cold drinks and juices — bright rooftop tone.
  [
    /citronnade|limonade|jus|juice|smoothie|milkshake|lemonade|yuzu|ginger|fizz|cola|gazeuse|soda|energisante|the-glace|iced|cold-brew|matcha-latte|matcha|virgin/,
    ROOFTOP,
  ],
  // Hot drinks — classic café shot.
  [
    /express|espresso|ristretto|turc|cappuccino|capucin|flat-white|cold-brew|mocha|liegeois|direct|affogato|latte|chocolat-chaud|chocolat-noir|the|verveine|the-menthe|infusion|earl-grey|pignons/,
    COFFEE,
  ],
  // Scandinavian pastries — minimalist bakery.
  [/cruffin|kouign|cinnamon|cardamom|skolebrod|skole|boller|wienerbrod/, SCANDI_PASTRY],
  // French pastry / Tunisian sweets — patisserie board.
  [
    /baklawa|makroudh|bambalouni|zlabia|kaak|tarte|fondant|cheesecake|carrot-cake|cruffin|eclair|opera|mille-feuille|panna|tiramisu|chausson|cruffin|gateaux|patisserie-du-jour|framboise|caramel-noisette|dame-blanche/,
    PATISSERIE,
  ],
  // Viennoiseries / breakfast baked goods.
  [
    /croissant|pain-au-chocolat|tartine|viennoiserie|granola|avocado-toast|acai|bowl|fricasse|chapati|sandwich-tunisien/,
    PATISSERIE,
  ],
  // Pizza.
  [/pizza|margherita|napolitaine|quatre-fromages|vegetarienne|bruschetta/, PIZZA],
  // Pasta / Italian mains.
  [
    /pates|penne|spaghetti|lasagne|tagliatelles|risotto|saltimbocca|osso-buco|carpaccio|burrata|antipasti/,
    TRATTORIA,
  ],
  // Grill / Tunisian mains.
  [
    /grillade|merguez|brochette|escalope|loup|makloub|mixed-grill|mechouia|tunisienne|olives|fromage|salade-cesar|cesar|thon|salade/,
    GRILL,
  ],
  // Frites and sides.
  [/frites|nachos|sides/, GRILL],
  // Glaces / sundaes / gaufres / crepes — ice cream parlour.
  [/glace|coupe|sundae|gaufre|crepe|affogato|sorbet/, ICE_CREAM],
  // Water bottles and generic cafe-drink extras.
  [/eau|water|plate|petillante|minerale/, COFFEE_BAR],
  // Modern-café specialty drinks / plates fallback.
  [/specialite|signature|bites|formule|enfant/, CAFE_MODERN],
];

/**
 * Returns a demo product photo URL for a known demo venue, or null for other venues (owner
 * uploads their own media for those).
 */
export function demoPhotoForProduct(venueSlug: string, productSlug: string): string | null {
  if (!DEMO_SLUGS.has(venueSlug)) return null;
  const slug = productSlug.toLowerCase();
  for (const [re, url] of RULES) if (re.test(slug)) return url;
  return CAFE_MODERN;
}
