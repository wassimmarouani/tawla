import type { Locale } from '@/i18n/locales';

/** Localized string in the three supported locales (FR default, AR, EN). */
export interface TemplateText {
  fr: string;
  ar: string;
  en: string;
}

type I18n = Partial<Record<Locale, string>>;

/** One product inside a template category: price in millimes (0 stays editable). */
export interface TemplateProduct {
  name: TemplateText;
  description?: TemplateText;
  /** Integer millimes: 2500 = 2.500 DT. */
  price: number;
}

export interface TemplateCategory {
  name: TemplateText;
  products: readonly TemplateProduct[];
}

export interface MenuTemplate {
  /** Stable id (kebab-case), used by the picker and in audit logs. */
  id: string;
  /** Name shown on the picker card. */
  title: TemplateText;
  /** One-line description shown on the card. */
  description: TemplateText;
  /** Categories and products inserted when the template is applied. */
  categories: readonly TemplateCategory[];
}

/** TemplateText → the server mutation's i18n JSON column (same shape as AI import). */
export function templateI18n(text: TemplateText): I18n {
  return { fr: text.fr, ar: text.ar, en: text.en };
}

/** Classic Tunisian café: coffee, tea, juices, breakfast. */
const CAFE: MenuTemplate = {
  id: 'cafe-classique',
  title: { fr: 'Café classique', ar: 'مقهى كلاسيكي', en: 'Classic café' },
  description: {
    fr: 'Cafés, thés, jus pressés, petit-déjeuner et douceurs — 18 articles prêts.',
    ar: 'قهوة وشاي وعصير طازج وفطور وحلويات — 18 عنصرًا جاهزًا.',
    en: 'Coffee, tea, fresh juices, breakfast and sweets — 18 items ready.',
  },
  categories: [
    {
      name: { fr: 'Cafés', ar: 'قهوة', en: 'Coffee' },
      products: [
        { name: { fr: 'Express', ar: 'إكسبريس', en: 'Espresso' }, price: 1800 },
        { name: { fr: 'Direct', ar: 'قهوة ديراكت', en: 'Direct (milky)' }, price: 2800 },
        { name: { fr: 'Capucin', ar: 'كابوسان', en: 'Capucin' }, price: 2200 },
        { name: { fr: 'Café turc', ar: 'قهوة تركية', en: 'Turkish coffee' }, price: 2500 },
        { name: { fr: 'Cappuccino', ar: 'كابتشينو', en: 'Cappuccino' }, price: 4000 },
      ],
    },
    {
      name: { fr: 'Thés & infusions', ar: 'شاي ومشروبات عشبية', en: 'Teas & infusions' },
      products: [
        { name: { fr: 'Thé à la menthe', ar: 'شاي بالنعناع', en: 'Mint tea' }, price: 2000 },
        { name: { fr: 'Thé aux pignons', ar: 'شاي بالصنوبر', en: 'Pine nut tea' }, price: 6500 },
        { name: { fr: 'Verveine', ar: 'لويزة', en: 'Lemon verbena' }, price: 2500 },
      ],
    },
    {
      name: { fr: 'Boissons fraîches', ar: 'مشروبات باردة', en: 'Cold drinks' },
      products: [
        { name: { fr: 'Citronnade', ar: 'عصير الليمون', en: 'Tunisian lemonade' }, price: 4500 },
        {
          name: { fr: 'Jus d’orange pressé', ar: 'عصير برتقال طازج', en: 'Fresh orange juice' },
          price: 5000,
        },
        {
          name: { fr: 'Eau minérale 0,5 L', ar: 'مياه معدنية 0.5 ل', en: 'Still water 0.5 L' },
          price: 1500,
        },
        { name: { fr: 'Boisson gazeuse', ar: 'مشروب غازي', en: 'Soft drink' }, price: 3000 },
      ],
    },
    {
      name: { fr: 'Petit-déjeuner', ar: 'فطور الصباح', en: 'Breakfast' },
      products: [
        { name: { fr: 'Croissant', ar: 'كرواسون', en: 'Croissant' }, price: 2500 },
        {
          name: { fr: 'Pain au chocolat', ar: 'خبز بالشوكولاتة', en: 'Pain au chocolat' },
          price: 2800,
        },
        {
          name: {
            fr: 'Tartine beurre-confiture',
            ar: 'خبز بالزبدة والمربى',
            en: 'Bread, butter & jam',
          },
          price: 4000,
        },
      ],
    },
    {
      name: { fr: 'Douceurs', ar: 'حلويات', en: 'Sweets' },
      products: [
        { name: { fr: 'Bambalouni', ar: 'بمبالوني', en: 'Bambalouni' }, price: 2500 },
        { name: { fr: 'Makroudh', ar: 'مقروض', en: 'Makroudh' }, price: 1500 },
        { name: { fr: 'Baklawa', ar: 'بقلاوة', en: 'Baklava' }, price: 3500 },
      ],
    },
  ],
};

/** Pizzeria: pizzas, pastas, salads, drinks, desserts. */
const PIZZERIA: MenuTemplate = {
  id: 'pizzeria',
  title: { fr: 'Pizzeria', ar: 'بيتزيريا', en: 'Pizzeria' },
  description: {
    fr: 'Pizzas, pâtes, salades et desserts — 18 articles prêts à adapter.',
    ar: 'بيتزا ومعكرونة وسلطات وحلويات — 18 عنصرًا جاهزًا للتعديل.',
    en: 'Pizzas, pasta, salads and desserts — 18 items ready to adapt.',
  },
  categories: [
    {
      name: { fr: 'Pizzas', ar: 'بيتزا', en: 'Pizzas' },
      products: [
        { name: { fr: 'Margherita', ar: 'مارغريتا', en: 'Margherita' }, price: 14000 },
        { name: { fr: 'Napolitaine', ar: 'نابوليتان', en: 'Napoletana' }, price: 16000 },
        { name: { fr: 'Thon', ar: 'بالطن', en: 'Tuna' }, price: 17000 },
        { name: { fr: 'Fruits de mer', ar: 'ثمار البحر', en: 'Seafood' }, price: 22000 },
        { name: { fr: 'Quatre fromages', ar: 'أربع أجبان', en: 'Four cheeses' }, price: 19000 },
        { name: { fr: 'Végétarienne', ar: 'نباتية', en: 'Vegetarian' }, price: 16000 },
      ],
    },
    {
      name: { fr: 'Pâtes', ar: 'معكرونة', en: 'Pasta' },
      products: [
        {
          name: { fr: 'Spaghetti bolognaise', ar: 'سباغيتي بولونيز', en: 'Spaghetti bolognese' },
          price: 15000,
        },
        {
          name: { fr: 'Penne arrabiata', ar: 'بيني ارابياتا', en: 'Penne arrabbiata' },
          price: 13000,
        },
        { name: { fr: 'Lasagnes maison', ar: 'لازانيا', en: 'Homemade lasagna' }, price: 18000 },
      ],
    },
    {
      name: { fr: 'Salades', ar: 'سلطات', en: 'Salads' },
      products: [
        { name: { fr: 'Salade césar', ar: 'سلطة سيزر', en: 'Caesar salad' }, price: 13000 },
        { name: { fr: 'Salade tunisienne', ar: 'سلطة تونسية', en: 'Tunisian salad' }, price: 8000 },
        { name: { fr: 'Salade méchouia', ar: 'سلطة مشوية', en: 'Mechouia salad' }, price: 9000 },
      ],
    },
    {
      name: { fr: 'Boissons', ar: 'مشروبات', en: 'Drinks' },
      products: [
        {
          name: { fr: 'Eau minérale 0,5 L', ar: 'مياه معدنية 0.5 ل', en: 'Still water 0.5 L' },
          price: 1500,
        },
        { name: { fr: 'Boisson gazeuse', ar: 'مشروب غازي', en: 'Soft drink' }, price: 3500 },
        { name: { fr: 'Jus d’orange', ar: 'عصير برتقال', en: 'Orange juice' }, price: 5000 },
      ],
    },
    {
      name: { fr: 'Desserts', ar: 'حلويات', en: 'Desserts' },
      products: [
        { name: { fr: 'Tiramisu', ar: 'تيراميسو', en: 'Tiramisu' }, price: 6500 },
        { name: { fr: 'Panna cotta', ar: 'بانا كوتا', en: 'Panna cotta' }, price: 6000 },
        {
          name: { fr: 'Glace deux boules', ar: 'مثلجات بكرتين', en: 'Two-scoop ice cream' },
          price: 6000,
        },
      ],
    },
  ],
};

/** Pâtisserie / salon de thé: cakes, pastries, drinks. */
const PATISSERIE: MenuTemplate = {
  id: 'patisserie',
  title: { fr: 'Pâtisserie', ar: 'حلويات', en: 'Pastry shop' },
  description: {
    fr: 'Gâteaux, viennoiseries et boissons chaudes — 15 articles prêts.',
    ar: 'كعك ومعجنات ومشروبات ساخنة — 15 عنصرًا جاهزًا.',
    en: 'Cakes, pastries and hot drinks — 15 items ready.',
  },
  categories: [
    {
      name: { fr: 'Gâteaux tunisiens', ar: 'حلويات تونسية', en: 'Tunisian sweets' },
      products: [
        { name: { fr: 'Baklawa', ar: 'بقلاوة', en: 'Baklava' }, price: 3500 },
        { name: { fr: 'Makroudh', ar: 'مقروض', en: 'Makroudh' }, price: 1500 },
        { name: { fr: 'Kaak warka', ar: 'كعك ورقة', en: 'Kaak warka' }, price: 2000 },
        { name: { fr: 'Zlabia', ar: 'زلابية', en: 'Zlabia' }, price: 1500 },
      ],
    },
    {
      name: { fr: 'Gâteaux à la part', ar: 'حلويات بالقطعة', en: 'Cakes by the slice' },
      products: [
        { name: { fr: 'Tarte au citron', ar: 'تارت بالليمون', en: 'Lemon tart' }, price: 5500 },
        {
          name: { fr: 'Fondant au chocolat', ar: 'فوندان شوكولا', en: 'Chocolate fondant' },
          price: 6000,
        },
        { name: { fr: 'Tiramisu', ar: 'تيراميسو', en: 'Tiramisu' }, price: 6500 },
      ],
    },
    {
      name: { fr: 'Viennoiseries', ar: 'معجنات', en: 'Pastries' },
      products: [
        { name: { fr: 'Croissant', ar: 'كرواسون', en: 'Croissant' }, price: 2500 },
        {
          name: { fr: 'Pain au chocolat', ar: 'خبز بالشوكولاتة', en: 'Pain au chocolat' },
          price: 2800,
        },
        {
          name: { fr: 'Chausson aux pommes', ar: 'شوسون بالتفاح', en: 'Apple turnover' },
          price: 3500,
        },
      ],
    },
    {
      name: { fr: 'Boissons chaudes', ar: 'مشروبات ساخنة', en: 'Hot drinks' },
      products: [
        { name: { fr: 'Express', ar: 'إكسبريس', en: 'Espresso' }, price: 1800 },
        { name: { fr: 'Cappuccino', ar: 'كابتشينو', en: 'Cappuccino' }, price: 4000 },
        { name: { fr: 'Thé à la menthe', ar: 'شاي بالنعناع', en: 'Mint tea' }, price: 2000 },
      ],
    },
    {
      name: { fr: 'Boissons fraîches', ar: 'مشروبات باردة', en: 'Cold drinks' },
      products: [
        { name: { fr: 'Citronnade', ar: 'عصير الليمون', en: 'Lemonade' }, price: 4500 },
        { name: { fr: 'Jus d’orange', ar: 'عصير برتقال', en: 'Orange juice' }, price: 5000 },
      ],
    },
  ],
};

/** All templates, in display order on the picker. */
export const MENU_TEMPLATES: readonly MenuTemplate[] = [CAFE, PIZZERIA, PATISSERIE];

/** Find a template by id, undefined when unknown. */
export function findTemplate(id: string): MenuTemplate | undefined {
  return MENU_TEMPLATES.find((template) => template.id === id);
}
