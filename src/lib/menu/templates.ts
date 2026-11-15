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

/** Modern beachside / coffee shop café: specialty drinks, smoothies, bowls. */
const CAFE_MODERN: MenuTemplate = {
  id: 'cafe-modern',
  title: { fr: 'Café moderne', ar: 'مقهى عصري', en: 'Modern café' },
  description: {
    fr: 'Spécialités de café, smoothies et bowls — 16 articles prêts.',
    ar: 'قهوة مختصة وسموذي وبولز — 16 عنصرًا جاهزًا.',
    en: 'Specialty coffee, smoothies and bowls — 16 items ready.',
  },
  categories: [
    {
      name: { fr: 'Café de spécialité', ar: 'قهوة مختصة', en: 'Specialty coffee' },
      products: [
        { name: { fr: 'Flat white', ar: 'فلات وايت', en: 'Flat white' }, price: 5500 },
        { name: { fr: 'Latte vanille', ar: 'لاتيه فانيليا', en: 'Vanilla latte' }, price: 6000 },
        { name: { fr: 'Cold brew', ar: 'كولد برو', en: 'Cold brew' }, price: 6500 },
        {
          name: { fr: 'Mocha chocolat noir', ar: 'موكا شوكولا داكنة', en: 'Dark chocolate mocha' },
          price: 7000,
        },
      ],
    },
    {
      name: { fr: 'Smoothies & matcha', ar: 'سموذي وماتشا', en: 'Smoothies & matcha' },
      products: [
        {
          name: {
            fr: 'Smoothie fraise-banane',
            ar: 'سموذي فراولة وموز',
            en: 'Strawberry-banana smoothie',
          },
          price: 8000,
        },
        {
          name: {
            fr: 'Smoothie avocat-miel',
            ar: 'سموذي أفوكادو وعسل',
            en: 'Avocado-honey smoothie',
          },
          price: 9000,
        },
        { name: { fr: 'Matcha latte', ar: 'ماتشا لاتيه', en: 'Matcha latte' }, price: 7500 },
      ],
    },
    {
      name: { fr: 'Bowls & toasts', ar: 'بولز وتوست', en: 'Bowls & toasts' },
      products: [
        { name: { fr: 'Açaï bowl', ar: 'آساي بول', en: 'Açaí bowl' }, price: 15000 },
        { name: { fr: 'Avocado toast', ar: 'توست الأفوكادو', en: 'Avocado toast' }, price: 11000 },
        {
          name: { fr: 'Granola yaourt', ar: 'غرانولا بالياغورت', en: 'Yogurt granola' },
          price: 9500,
        },
      ],
    },
    {
      name: { fr: 'Pâtisserie du jour', ar: 'حلويات اليوم', en: 'Pastry of the day' },
      products: [
        {
          name: {
            fr: 'Cookie choco-noisette',
            ar: 'كوكي شوكولا وبندق',
            en: 'Choc-hazelnut cookie',
          },
          price: 3500,
        },
        { name: { fr: 'Carrot cake', ar: 'كيك الجزر', en: 'Carrot cake' }, price: 5500 },
        { name: { fr: 'Cheesecake', ar: 'تشيزكيك', en: 'Cheesecake' }, price: 6500 },
      ],
    },
  ],
};

/** Italian trattoria / fine dining: antipasti, pasta fresca, main courses, wine pairing. */
const TRATTORIA: MenuTemplate = {
  id: 'trattoria',
  title: { fr: 'Trattoria italienne', ar: 'تراتوريا إيطالية', en: 'Italian trattoria' },
  description: {
    fr: 'Antipasti, pâtes fraîches, plats et desserts — 20 articles prêts.',
    ar: 'مقبّلات، معكرونة طازجة، أطباق وحلويات — 20 عنصرًا جاهزًا.',
    en: 'Antipasti, fresh pasta, mains and desserts — 20 items ready.',
  },
  categories: [
    {
      name: { fr: 'Antipasti', ar: 'مقبّلات', en: 'Antipasti' },
      products: [
        {
          name: { fr: 'Bruschetta tomate', ar: 'بروسكيتا طماطم', en: 'Tomato bruschetta' },
          price: 9000,
        },
        {
          name: { fr: 'Carpaccio de bœuf', ar: 'كارباشيو لحم', en: 'Beef carpaccio' },
          price: 18000,
        },
        { name: { fr: 'Burrata Pouilles', ar: 'بوراتا', en: 'Puglia burrata' }, price: 22000 },
      ],
    },
    {
      name: { fr: 'Pâtes fraîches', ar: 'معكرونة طازجة', en: 'Fresh pasta' },
      products: [
        {
          name: { fr: 'Tagliatelles truffe', ar: 'تاغلياتيلي بالكمأة', en: 'Truffle tagliatelle' },
          price: 32000,
        },
        {
          name: {
            fr: 'Ravioli ricotta-épinards',
            ar: 'رافيولي ريكوتا وسبانخ',
            en: 'Ricotta-spinach ravioli',
          },
          price: 24000,
        },
        {
          name: {
            fr: 'Linguine aux fruits de mer',
            ar: 'لينغويني بثمار البحر',
            en: 'Seafood linguine',
          },
          price: 28000,
        },
        {
          name: { fr: 'Risotto champignons', ar: 'ريزوتو بالفطر', en: 'Mushroom risotto' },
          price: 22000,
        },
      ],
    },
    {
      name: { fr: 'Plats', ar: 'أطباق رئيسية', en: 'Mains' },
      products: [
        { name: { fr: 'Osso buco', ar: 'أوسو بوكو', en: 'Osso buco' }, price: 45000 },
        { name: { fr: 'Saltimbocca', ar: 'سالتيمبوكا', en: 'Saltimbocca' }, price: 38000 },
        {
          name: { fr: 'Loup grillé au citron', ar: 'قاروص مشوي بالليمون', en: 'Grilled sea bass' },
          price: 42000,
        },
      ],
    },
    {
      name: { fr: 'Desserts', ar: 'حلويات', en: 'Desserts' },
      products: [
        {
          name: { fr: 'Tiramisu maison', ar: 'تيراميسو البيت', en: 'Homemade tiramisu' },
          price: 9000,
        },
        {
          name: {
            fr: 'Panna cotta fruits rouges',
            ar: 'بانا كوتا بالتوت',
            en: 'Red-berry panna cotta',
          },
          price: 8500,
        },
        { name: { fr: 'Affogato', ar: 'أفوغاتو', en: 'Affogato' }, price: 7000 },
      ],
    },
    {
      name: { fr: 'Vins & boissons', ar: 'نبيذ ومشروبات', en: 'Wine & drinks' },
      products: [
        { name: { fr: 'Verre de Chianti', ar: 'كأس كيانتي', en: 'Chianti glass' }, price: 15000 },
        { name: { fr: 'Prosecco coupe', ar: 'بروسيكو كأس', en: 'Prosecco glass' }, price: 18000 },
        {
          name: {
            fr: 'San Pellegrino 0,5 L',
            ar: 'سان بيلّيغرينو 0.5 ل',
            en: 'San Pellegrino 0.5 L',
          },
          price: 6000,
        },
        { name: { fr: 'Café ristretto', ar: 'ريستريتو', en: 'Ristretto' }, price: 3000 },
      ],
    },
  ],
};

/** Modern Nordic patisserie: minimalist, pastel, pastries by the piece, hot drinks. */
const PATISSERIE_MODERN: MenuTemplate = {
  id: 'patisserie-modern',
  title: { fr: 'Pâtisserie moderne', ar: 'حلويات عصرية', en: 'Modern pastry' },
  description: {
    fr: 'Entremets, viennoiseries signature, boissons. 15 articles.',
    ar: 'كيك، معجنات، مشروبات — 15 عنصرًا.',
    en: 'Layered cakes, signature pastries, drinks — 15 items.',
  },
  categories: [
    {
      name: { fr: 'Entremets', ar: 'كيك', en: 'Layered cakes' },
      products: [
        {
          name: { fr: 'Framboise-pistache', ar: 'توت وفستق', en: 'Raspberry-pistachio' },
          price: 9500,
        },
        {
          name: { fr: 'Chocolat noir 70%', ar: 'شوكولا 70%', en: 'Dark chocolate 70%' },
          price: 9000,
        },
        {
          name: { fr: 'Caramel-noisette', ar: 'كراميل وبندق', en: 'Caramel-hazelnut' },
          price: 9500,
        },
        { name: { fr: 'Yuzu-matcha', ar: 'يوزو وماتشا', en: 'Yuzu-matcha' }, price: 11000 },
      ],
    },
    {
      name: { fr: 'Viennoiseries signature', ar: 'معجنات مميّزة', en: 'Signature pastries' },
      products: [
        {
          name: {
            fr: 'Croissant au beurre AOP',
            ar: 'كرواسون بزبدة AOP',
            en: 'AOP butter croissant',
          },
          price: 3500,
        },
        {
          name: { fr: 'Pain au chocolat', ar: 'بان أو شوكولا', en: 'Pain au chocolat' },
          price: 3800,
        },
        {
          name: { fr: 'Cruffin fraise', ar: 'كرافِن فراولة', en: 'Strawberry cruffin' },
          price: 5500,
        },
        { name: { fr: 'Kouign-amann', ar: 'كوين أمان', en: 'Kouign-amann' }, price: 4500 },
      ],
    },
    {
      name: { fr: 'Boissons chaudes', ar: 'مشروبات ساخنة', en: 'Hot drinks' },
      products: [
        {
          name: { fr: 'Chocolat chaud intense', ar: 'شوكولا ساخن', en: 'Rich hot chocolate' },
          price: 7500,
        },
        { name: { fr: 'Thé Earl Grey', ar: 'شاي إيرل غراي', en: 'Earl Grey tea' }, price: 3500 },
        { name: { fr: 'Cappuccino', ar: 'كابتشينو', en: 'Cappuccino' }, price: 4500 },
      ],
    },
    {
      name: { fr: 'Boissons fraîches', ar: 'مشروبات باردة', en: 'Cold drinks' },
      products: [
        {
          name: { fr: 'Thé glacé pêche', ar: 'شاي بارد بالخوخ', en: 'Peach iced tea' },
          price: 5000,
        },
        {
          name: { fr: 'Limonade artisanale', ar: 'ليموناضة حرفية', en: 'Artisan lemonade' },
          price: 5500,
        },
        { name: { fr: 'Eau plate 0,5 L', ar: 'ماء 0.5 ل', en: 'Still water 0.5 L' }, price: 1500 },
        {
          name: { fr: 'Eau pétillante 0,5 L', ar: 'مياه غازية 0.5 ل', en: 'Sparkling water 0.5 L' },
          price: 2500,
        },
      ],
    },
  ],
};

/** Night bar / cocktails: signature drinks, classics, bites, mocktails. */
const BAR_COCKTAIL: MenuTemplate = {
  id: 'bar-cocktail',
  title: { fr: 'Bar cocktails', ar: 'بار كوكتيل', en: 'Cocktail bar' },
  description: {
    fr: 'Signatures, classiques, mocktails et bites. 18 articles.',
    ar: 'كوكتيل مميّز، كلاسيكيات، مشروبات بلا كحول ومقبّلات — 18 عنصرًا.',
    en: 'Signature cocktails, classics, mocktails and bites — 18 items.',
  },
  categories: [
    {
      name: { fr: 'Signatures', ar: 'كوكتيل مميّز', en: 'Signatures' },
      products: [
        {
          name: { fr: 'Carthage Sunset', ar: 'كارثاج سنسِت', en: 'Carthage Sunset' },
          price: 28000,
        },
        {
          name: { fr: 'Sidi Bou Breeze', ar: 'سيدي بو بريز', en: 'Sidi Bou Breeze' },
          price: 26000,
        },
        {
          name: { fr: 'Medina Negroni', ar: 'ميدينا نيغروني', en: 'Medina Negroni' },
          price: 30000,
        },
      ],
    },
    {
      name: { fr: 'Classiques', ar: 'كلاسيكيات', en: 'Classics' },
      products: [
        { name: { fr: 'Mojito', ar: 'موهيتو', en: 'Mojito' }, price: 22000 },
        { name: { fr: 'Old Fashioned', ar: 'أولد فاشِن', en: 'Old Fashioned' }, price: 28000 },
        { name: { fr: 'Margarita', ar: 'مارغريتا', en: 'Margarita' }, price: 24000 },
        { name: { fr: 'Spritz Aperol', ar: 'سبريتز أبيرول', en: 'Aperol Spritz' }, price: 24000 },
      ],
    },
    {
      name: { fr: 'Mocktails', ar: 'بدون كحول', en: 'Mocktails' },
      products: [
        { name: { fr: 'Virgin mojito', ar: 'فيرجين موهيتو', en: 'Virgin mojito' }, price: 12000 },
        {
          name: {
            fr: 'Pink lady sans alcool',
            ar: 'بينك ليدي بدون كحول',
            en: 'Pink lady mocktail',
          },
          price: 13000,
        },
        {
          name: { fr: 'Ginger lemon fizz', ar: 'زنجبيل وليمون', en: 'Ginger lemon fizz' },
          price: 10000,
        },
      ],
    },
    {
      name: { fr: 'Bites', ar: 'مقبّلات', en: 'Bites' },
      products: [
        { name: { fr: 'Olives marinées', ar: 'زيتون منقوع', en: 'Marinated olives' }, price: 7000 },
        {
          name: { fr: 'Nachos & guacamole', ar: 'ناتشوز وغواكامولي', en: 'Nachos & guacamole' },
          price: 15000,
        },
        {
          name: { fr: 'Fromages tunisiens', ar: 'جبن تونسي', en: 'Tunisian cheeseboard' },
          price: 24000,
        },
        {
          name: { fr: 'Carpaccio de bœuf', ar: 'كارباشيو لحم', en: 'Beef carpaccio' },
          price: 22000,
        },
      ],
    },
    {
      name: { fr: 'Bières & softs', ar: 'بيرة ومشروبات غازية', en: 'Beers & softs' },
      products: [
        { name: { fr: 'Celtia', ar: 'سلتيا', en: 'Celtia' }, price: 7000 },
        { name: { fr: 'Boisson gazeuse', ar: 'مشروب غازي', en: 'Soft drink' }, price: 4000 },
        { name: { fr: 'Eau 0,5 L', ar: 'ماء 0.5 ل', en: 'Water 0.5 L' }, price: 2000 },
        {
          name: { fr: 'Boisson énergisante', ar: 'مشروب الطاقة', en: 'Energy drink' },
          price: 8000,
        },
      ],
    },
  ],
};

/** Tunisian street food / grill: sandwiches, grilled meats, sides, fried extras. */
const STREET_FOOD: MenuTemplate = {
  id: 'street-food',
  title: { fr: 'Street food & grill', ar: 'ستريت فود وغريل', en: 'Street food & grill' },
  description: {
    fr: 'Sandwichs, grillades, frites et boissons. 18 articles.',
    ar: 'سندويتشات، شواء، بطاطا ومشروبات — 18 عنصرًا.',
    en: 'Sandwiches, grilled meats, fries and drinks — 18 items.',
  },
  categories: [
    {
      name: { fr: 'Sandwichs', ar: 'سندويتشات', en: 'Sandwiches' },
      products: [
        { name: { fr: 'Fricassé thon', ar: 'فريكاسي بالطن', en: 'Tuna fricassé' }, price: 3500 },
        {
          name: { fr: 'Sandwich tunisien', ar: 'سندويتش تونسي', en: 'Tunisian sandwich' },
          price: 7500,
        },
        { name: { fr: 'Chapati poulet', ar: 'شباتي دجاج', en: 'Chicken chapati' }, price: 9000 },
        { name: { fr: 'Makloub viande', ar: 'مقلوب لحم', en: 'Meat makloub' }, price: 11000 },
      ],
    },
    {
      name: { fr: 'Grillades', ar: 'شواء', en: 'Grills' },
      products: [
        {
          name: { fr: 'Escalope poulet', ar: 'اسكالوب دجاج', en: 'Chicken escalope' },
          price: 14000,
        },
        { name: { fr: 'Brochette merguez', ar: 'شيش مرقاز', en: 'Merguez skewer' }, price: 12000 },
        { name: { fr: 'Mixed grill', ar: 'ميكس غريل', en: 'Mixed grill' }, price: 22000 },
      ],
    },
    {
      name: { fr: 'Frites & sides', ar: 'بطاطا وسايد', en: 'Fries & sides' },
      products: [
        { name: { fr: 'Frites maison', ar: 'بطاطا مقلية', en: 'House fries' }, price: 4000 },
        {
          name: { fr: 'Frites cheddar-bacon', ar: 'بطاطا بالشيدر', en: 'Cheddar-bacon fries' },
          price: 7000,
        },
        { name: { fr: 'Salade césar', ar: 'سلطة سيزر', en: 'Caesar salad' }, price: 9000 },
      ],
    },
    {
      name: { fr: 'Formules', ar: 'مينيو', en: 'Combos' },
      products: [
        { name: { fr: 'Menu enfant', ar: 'مينيو أطفال', en: 'Kids menu' }, price: 15000 },
        {
          name: {
            fr: 'Menu burger + frites + soda',
            ar: 'مينيو برغر + بطاطا + مشروب',
            en: 'Burger combo',
          },
          price: 22000,
        },
      ],
    },
    {
      name: { fr: 'Boissons', ar: 'مشروبات', en: 'Drinks' },
      products: [
        { name: { fr: 'Soda', ar: 'مشروب غازي', en: 'Soda' }, price: 3000 },
        { name: { fr: 'Eau 0,5 L', ar: 'ماء 0.5 ل', en: 'Water 0.5 L' }, price: 1500 },
        { name: { fr: 'Milkshake', ar: 'ميلك شيك', en: 'Milkshake' }, price: 8000 },
        {
          name: { fr: 'Boisson énergisante', ar: 'مشروب الطاقة', en: 'Energy drink' },
          price: 7000,
        },
      ],
    },
  ],
};

/** Ice-cream parlor / glacier: cups, waffles, sundaes, cold drinks. */
const GLACIER: MenuTemplate = {
  id: 'glacier',
  title: { fr: 'Glacier', ar: 'جلاطي', en: 'Ice-cream parlor' },
  description: {
    fr: 'Coupes, gaufres, sundaes et boissons. 14 articles.',
    ar: 'كؤوس، غوفر، سَنداي ومشروبات — 14 عنصرًا.',
    en: 'Cups, waffles, sundaes and drinks — 14 items.',
  },
  categories: [
    {
      name: { fr: 'Coupes glacées', ar: 'كؤوس مثلجات', en: 'Ice-cream cups' },
      products: [
        { name: { fr: 'Coupe 2 boules', ar: 'كأس بكرتين', en: 'Two-scoop cup' }, price: 6000 },
        {
          name: { fr: 'Coupe 3 boules', ar: 'كأس بثلاث كرات', en: 'Three-scoop cup' },
          price: 8500,
        },
        { name: { fr: 'Dame blanche', ar: 'دام بلانش', en: 'Dame blanche' }, price: 12000 },
        { name: { fr: 'Café liégeois', ar: 'قهوة ليجوا', en: 'Café liégeois' }, price: 11000 },
      ],
    },
    {
      name: { fr: 'Gaufres & crêpes', ar: 'غوفر وكريب', en: 'Waffles & crêpes' },
      products: [
        { name: { fr: 'Gaufre Nutella', ar: 'غوفر نوتيلا', en: 'Nutella waffle' }, price: 9000 },
        {
          name: { fr: 'Gaufre fruits rouges', ar: 'غوفر بالتوت', en: 'Red-fruit waffle' },
          price: 10000,
        },
        {
          name: {
            fr: 'Crêpe banane-chocolat',
            ar: 'كريب موز وشوكولا',
            en: 'Banana-chocolate crêpe',
          },
          price: 9500,
        },
      ],
    },
    {
      name: { fr: 'Sundaes', ar: 'سَنداي', en: 'Sundaes' },
      products: [
        {
          name: { fr: 'Sundae chocolat', ar: 'سَنداي شوكولا', en: 'Chocolate sundae' },
          price: 11000,
        },
        { name: { fr: 'Sundae caramel', ar: 'سَنداي كراميل', en: 'Caramel sundae' }, price: 11000 },
        {
          name: { fr: 'Sundae fraise', ar: 'سَنداي فراولة', en: 'Strawberry sundae' },
          price: 11000,
        },
      ],
    },
    {
      name: { fr: 'Boissons', ar: 'مشروبات', en: 'Drinks' },
      products: [
        {
          name: { fr: 'Milkshake vanille', ar: 'ميلك شيك فانيليا', en: 'Vanilla milkshake' },
          price: 9000,
        },
        { name: { fr: 'Citronnade', ar: 'عصير الليمون', en: 'Lemonade' }, price: 5000 },
        { name: { fr: 'Boisson gazeuse', ar: 'مشروب غازي', en: 'Soft drink' }, price: 3500 },
        { name: { fr: 'Eau 0,5 L', ar: 'ماء 0.5 ل', en: 'Water 0.5 L' }, price: 1500 },
      ],
    },
  ],
};

/** All templates, in display order on the picker. Expanded for the sales demos. */
export const MENU_TEMPLATES: readonly MenuTemplate[] = [
  CAFE,
  CAFE_MODERN,
  PIZZERIA,
  TRATTORIA,
  PATISSERIE,
  PATISSERIE_MODERN,
  BAR_COCKTAIL,
  STREET_FOOD,
  GLACIER,
];

/** Find a template by id, undefined when unknown. */
export function findTemplate(id: string): MenuTemplate | undefined {
  return MENU_TEMPLATES.find((template) => template.id === id);
}
