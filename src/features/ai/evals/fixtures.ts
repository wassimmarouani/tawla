/**
 * AI menu import evals (ADR-0025 §7): realistic Tunisian menus, rendered to images by
 * scripts/ai-eval.ts, with the expected items. Prices are integer millimes; `printed` is how the
 * menu shows them. Styles cover printed FR, printed AR, bilingual, handwritten and chalkboard.
 */

export type EvalStyle = 'printed' | 'handwritten' | 'chalkboard';

export interface EvalItem {
  name: string;
  printed: string;
  price: number;
}

export interface EvalMenu {
  id: string;
  title: string;
  style: EvalStyle;
  direction: 'ltr' | 'rtl';
  categories: { name: string; items: EvalItem[] }[];
}

export const EVAL_MENUS: readonly EvalMenu[] = [
  {
    id: 'cafe-printed-fr',
    title: 'Café de la Médina',
    style: 'printed',
    direction: 'ltr',
    categories: [
      {
        name: 'Boissons chaudes',
        items: [
          { name: 'Express', printed: '1,800 DT', price: 1800 },
          { name: 'Capucin', printed: '2,200 DT', price: 2200 },
          { name: 'Café direct', printed: '2,800 DT', price: 2800 },
          { name: 'Thé à la menthe', printed: '2,000 DT', price: 2000 },
          { name: 'Thé aux pignons', printed: '5,500 DT', price: 5500 },
        ],
      },
      {
        name: 'Boissons fraîches',
        items: [
          { name: 'Citronnade', printed: '3,500 DT', price: 3500 },
          { name: 'Jus d’orange pressé', printed: '4,500 DT', price: 4500 },
          { name: 'Eau minérale 0,5 L', printed: '1,200 DT', price: 1200 },
          { name: 'Soda', printed: '2,500 DT', price: 2500 },
        ],
      },
    ],
  },
  {
    id: 'restaurant-printed-ar',
    title: 'مطعم البحر',
    style: 'printed',
    direction: 'rtl',
    categories: [
      {
        name: 'أطباق تونسية',
        items: [
          { name: 'لبلابي', printed: '4.500 د.ت', price: 4500 },
          { name: 'كفتاجي', printed: '7.000 د.ت', price: 7000 },
          { name: 'كسكسي بالحوت', printed: '18.000 د.ت', price: 18000 },
          { name: 'مقرونة بالدجاج', printed: '12.500 د.ت', price: 12500 },
        ],
      },
      {
        name: 'مشروبات',
        items: [
          { name: 'قهوة', printed: '1.800 د.ت', price: 1800 },
          { name: 'شاي أخضر', printed: '1.500 د.ت', price: 1500 },
          { name: 'عصير فراولة', printed: '5.000 د.ت', price: 5000 },
        ],
      },
    ],
  },
  {
    id: 'bilingual-fr-ar',
    title: 'Dar Zitouna · دار الزيتونة',
    style: 'printed',
    direction: 'ltr',
    categories: [
      {
        name: 'Entrées / مقبلات',
        items: [
          { name: 'Brik à l’œuf / بريك بالعظم', printed: '3,5', price: 3500 },
          { name: 'Salade méchouia / سلطة مشوية', printed: '6', price: 6000 },
          { name: 'Ojja merguez / عجة مرقاز', printed: '9,5', price: 9500 },
        ],
      },
      {
        name: 'Desserts / حلويات',
        items: [
          { name: 'Bambalouni / بمبالوني', printed: '2', price: 2000 },
          { name: 'Assida zgougou / عصيدة زقوقو', printed: '7,5', price: 7500 },
        ],
      },
    ],
  },
  {
    id: 'crepes-handwritten-fr',
    title: 'Crêperie du coin',
    style: 'handwritten',
    direction: 'ltr',
    categories: [
      {
        name: 'Crêpes sucrées',
        items: [
          { name: 'Crêpe chocolat', printed: '6 DT', price: 6000 },
          { name: 'Crêpe Nutella banane', printed: '8,5 DT', price: 8500 },
          { name: 'Crêpe miel amandes', printed: '7 DT', price: 7000 },
        ],
      },
      {
        name: 'Gaufres',
        items: [
          { name: 'Gaufre sucre', printed: '4 DT', price: 4000 },
          { name: 'Gaufre chocolat', printed: '6,5 DT', price: 6500 },
        ],
      },
    ],
  },
  {
    id: 'breakfast-chalkboard',
    title: 'Petit-déjeuner',
    style: 'chalkboard',
    direction: 'ltr',
    categories: [
      {
        name: 'Petit-déjeuner',
        items: [
          { name: 'Formule petit-déjeuner', printed: '9.900', price: 9900 },
          { name: 'Croissant', printed: '1.5', price: 1500 },
          { name: 'Pain au chocolat', printed: '1.8', price: 1800 },
          { name: 'Omelette fromage', printed: '5.5', price: 5500 },
        ],
      },
    ],
  },
  {
    id: 'pizzeria-printed-dense',
    title: 'Pizzeria Carthage',
    style: 'printed',
    direction: 'ltr',
    categories: [
      {
        name: 'Pizzas',
        items: [
          { name: 'Margherita', printed: '12.000', price: 12000 },
          { name: 'Neptune', printed: '15.000', price: 15000 },
          { name: 'Reine', printed: '14.500', price: 14500 },
          { name: '4 fromages', printed: '17.000', price: 17000 },
          { name: 'Tunisienne', printed: '16.000', price: 16000 },
          { name: 'Végétarienne', printed: '13.500', price: 13500 },
          { name: 'Fruits de mer', printed: '22.000', price: 22000 },
        ],
      },
      {
        name: 'Boissons',
        items: [
          { name: 'Boisson gazeuse 33 cl', printed: '2.500', price: 2500 },
          { name: 'Eau 1 L', printed: '1.500', price: 1500 },
        ],
      },
    ],
  },
];

/** Lowercase, no accents or punctuation: for matching extracted names to expected ones. */
export function matchKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ًͯ-ْ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface EvalScore {
  expected: number;
  found: number;
  priceExact: number;
}

/** Item recall and millime-exact prices against the expected menu. */
export function scoreDraft(
  menu: EvalMenu,
  draft: { categories: { products: { name: string; price: number | null }[] }[] },
): EvalScore {
  const extracted = draft.categories.flatMap((category) => category.products);
  let found = 0;
  let priceExact = 0;
  const expected = menu.categories.flatMap((category) => category.items);
  for (const item of expected) {
    const key = matchKey(item.name);
    const match =
      extracted.find((product) => matchKey(product.name) === key) ??
      extracted.find((product) => {
        const candidate = matchKey(product.name);
        return candidate.includes(key) || key.includes(candidate);
      });
    if (!match) continue;
    found += 1;
    if (match.price === item.price) priceExact += 1;
  }
  return { expected: expected.length, found, priceExact };
}
