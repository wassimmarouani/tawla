import type { Locale } from '@/i18n/locales';

/**
 * Static demo café used by the P0-06 visual-direction prototypes. This is restaurant content
 * (data), not UI copy, so it lives here and not in messages/. The real seed arrives in P1-01.
 */

export type Localized = Record<Locale, string>;
export type Badge = 'new' | 'popular' | 'spicy';

export interface DemoItem {
  id: string;
  name: Localized;
  description?: Localized;
  /** Integer millimes. */
  price: number;
  /** File name in public/demo, without extension. */
  photo?: string;
  badges?: readonly Badge[];
  available?: boolean;
}

export interface DemoCategory {
  id: string;
  name: Localized;
  items: readonly DemoItem[];
}

export const DEMO_VENUE = {
  name: { fr: 'Café El Bahja', ar: 'مقهى البهجة', en: 'Café El Bahja' } satisfies Localized,
  initials: 'EB',
  place: {
    fr: 'Café · Sidi Bou Saïd',
    ar: 'مقهى · سيدي بوسعيد',
    en: 'Café · Sidi Bou Saïd',
  } satisfies Localized,
  cover: 'cover-cafe-sidi-bou-said',
  closesAt: '23:00',
  table: 9,
};

export const DEMO_MENU: readonly DemoCategory[] = [
  {
    id: 'cafes',
    name: { fr: 'Cafés & thés', ar: 'قهوة وشاي', en: 'Coffee & tea' },
    items: [
      {
        id: 'express',
        name: { fr: 'Express', ar: 'إكسبريس', en: 'Espresso' },
        description: { fr: 'Court et serré', ar: 'قصير ومركّز', en: 'Short and intense' },
        price: 1800,
      },
      {
        id: 'direct',
        name: { fr: 'Direct', ar: 'ديراكت', en: 'Direct' },
        description: {
          fr: 'Express et lait chaud',
          ar: 'إكسبريس بالحليب الساخن',
          en: 'Espresso with hot milk',
        },
        price: 2200,
        badges: ['popular'],
      },
      {
        id: 'capucin',
        name: { fr: 'Capucin', ar: 'كابوسان', en: 'Capucin' },
        description: {
          fr: 'Express, un nuage de lait',
          ar: 'إكسبريس مع قليل من الحليب',
          en: 'Espresso, a dash of milk',
        },
        price: 2000,
      },
      {
        id: 'cafe-arbi',
        name: { fr: 'Café turc', ar: 'قهوة عربي', en: 'Turkish coffee' },
        description: {
          fr: 'Infusé au zezwa, eau de fleur d’oranger',
          ar: 'في الززوة مع ماء الزهر',
          en: 'Brewed in a zezwa, orange blossom',
        },
        price: 2500,
      },
      {
        id: 'the-menthe',
        name: { fr: 'Thé à la menthe', ar: 'تاي بالنعناع', en: 'Mint tea' },
        description: {
          fr: 'Thé vert, menthe fraîche · pignons +2,000',
          ar: 'شاي أخضر ونعناع طازج · بوفريوة +2.000',
          en: 'Green tea, fresh mint · pine nuts +2.000',
        },
        price: 2000,
      },
    ],
  },
  {
    id: 'boissons',
    name: { fr: 'Boissons fraîches', ar: 'مشروبات باردة', en: 'Cold drinks' },
    items: [
      {
        id: 'citronnade',
        name: { fr: 'Citronnade maison', ar: 'سيتروناد', en: 'Homemade lemonade' },
        description: {
          fr: 'Citron pressé, menthe, glace pilée',
          ar: 'ليمون معصور ونعناع وثلج',
          en: 'Pressed lemon, mint, crushed ice',
        },
        price: 3500,
        photo: 'citronnade',
        badges: ['popular'],
      },
      {
        id: 'jus-fraise',
        name: { fr: 'Jus de fraise', ar: 'عصير فراولة', en: 'Strawberry juice' },
        description: {
          fr: 'Fraises de saison mixées',
          ar: 'فراولة الموسم',
          en: 'Seasonal strawberries',
        },
        price: 5000,
      },
    ],
  },
  {
    id: 'douceurs',
    name: { fr: 'Douceurs', ar: 'حلويات', en: 'Sweets' },
    items: [
      {
        id: 'crepe',
        name: { fr: 'Crêpe chocolat', ar: 'كريب شوكولا', en: 'Chocolate crêpe' },
        description: {
          fr: 'Chocolat noir, amandes grillées, chantilly',
          ar: 'شوكولا داكنة ولوز محمّص',
          en: 'Dark chocolate, toasted almonds, cream',
        },
        price: 6500,
        photo: 'crepe-chocolat',
        badges: ['new'],
      },
      {
        id: 'croissant',
        name: { fr: 'Croissant pur beurre', ar: 'كرواسون بالزبدة', en: 'Butter croissant' },
        price: 1800,
        photo: 'croissant',
      },
      {
        id: 'makroud',
        name: { fr: 'Makroud', ar: 'مقروض', en: 'Makroud' },
        description: {
          fr: 'Semoule, pâte de dattes, miel · la pièce',
          ar: 'سميد وعجينة تمر وعسل · القطعة',
          en: 'Semolina, date paste, honey · each',
        },
        price: 1000,
        photo: 'makroud',
      },
      {
        id: 'bambalouni',
        name: { fr: 'Bambalouni', ar: 'بمبالوني', en: 'Bambalouni' },
        description: {
          fr: 'Beignet de Sidi Bou Saïd, sucre fin',
          ar: 'فطيرة سيدي بوسعيد بالسكر',
          en: 'Sidi Bou Saïd doughnut, fine sugar',
        },
        price: 1200,
      },
      {
        id: 'croissant-amandes',
        name: { fr: 'Croissant aux amandes', ar: 'كرواسون باللوز', en: 'Almond croissant' },
        price: 2800,
        available: false,
      },
    ],
  },
  {
    id: 'sale',
    name: { fr: 'Petit-déjeuner salé', ar: 'فطور مالح', en: 'Savoury breakfast' },
    items: [
      {
        id: 'ojja',
        name: { fr: 'Ojja merguez', ar: 'عجة مرقاز', en: 'Ojja with merguez' },
        description: {
          fr: 'Œufs, tomate, harissa, merguez',
          ar: 'بيض وطماطم وهريسة ومرقاز',
          en: 'Eggs, tomato, harissa, merguez',
        },
        price: 13500,
        photo: 'ojja',
        badges: ['spicy'],
      },
      {
        id: 'fricasse',
        name: { fr: 'Fricassé', ar: 'فريكاسي', en: 'Fricassé' },
        description: {
          fr: 'Thon, œuf, olives, harissa',
          ar: 'تن وبيض وزيتون وهريسة',
          en: 'Tuna, egg, olives, harissa',
        },
        price: 2500,
        photo: 'fricasse',
        badges: ['popular'],
      },
    ],
  },
];
