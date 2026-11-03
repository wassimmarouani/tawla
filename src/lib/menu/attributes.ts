/**
 * Product attributes (spec 02, spec 04): badges, the EU 14 allergens and dietary flags. Same
 * lists as the `products` check constraints; shared by the public menu and the editor.
 */
export const BADGES = ['new', 'popular', 'house', 'seasonal'] as const;
export const ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;
export const DIETARY = ['vegetarian', 'vegan', 'gluten_free', 'spicy'] as const;

export type Badge = (typeof BADGES)[number];
export type Allergen = (typeof ALLERGENS)[number];
export type Dietary = (typeof DIETARY)[number];
