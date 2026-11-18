import type { Locale } from '@/i18n/locales';

/** Translations of one quote: strings in each supported locale. */
export type LocalizedQuote = Record<Locale, string>;

export interface Testimonial {
  /** Stable id (kebab-case), used as the React key. */
  id: string;
  /** The exact quote the owner gave us, per locale. */
  quote: LocalizedQuote;
  /** Name of the person speaking, as they want it displayed. */
  author: string;
  /** Role or title, per locale — e.g. "Patron, Café El Bahja" / "صاحب مقهى البهجة". */
  role: LocalizedQuote;
  /** Optional city displayed after the role. */
  city?: string;
}

/**
 * Pilot and early-customer quotes shown on the home page (A4 — social proof, see docs/plan).
 * Three to six quotes is the sweet spot; the marketing home hides the whole section when the
 * list is empty.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: 'cafe-el-bahja',
    author: 'Mehdi Trabelsi',
    city: 'Tunis',
    quote: {
      fr: 'On a mis la carte en ligne en une après-midi. Les touristes lisent en anglais, mes serveurs reçoivent les appels sur la tablette : plus personne n’attend au comptoir.',
      ar: 'نشرنا القائمة في عشية واحدة. السياح يقرؤون بالإنجليزية والجرسون يتلقى النداءات على التابلت — ما عاد حد يستنى في الكونتوار.',
      en: 'We put the whole menu online in one afternoon. Tourists read it in English, my waiters get the calls on the tablet — nobody waits at the counter any more.',
    },
    role: {
      fr: 'Propriétaire, café de quartier',
      ar: 'صاحب مقهى حي',
      en: 'Owner, neighbourhood café',
    },
  },
  {
    id: 'pizzeria-medina',
    author: 'Sonia Khemiri',
    city: 'Sousse',
    quote: {
      fr: 'Avant Taply, on imprimait les menus chaque semaine. Maintenant je change un prix depuis mon téléphone et c’est fait. L’import par photo m’a économisé des heures.',
      ar: 'قبل تاپلي كنا نطبعوا القائمة كل جمعة. اليوم نبدّل السعر من التليفون وخلاص. الاستيراد بالتصوير ربّحني ساعات برشة.',
      en: 'Before Taply we printed menus every week. Now I change a price from my phone and it is done. The photo import saved me hours.',
    },
    role: {
      fr: 'Gérante, pizzeria',
      ar: 'مسيّرة بيتزيريا',
      en: 'Manager, pizzeria',
    },
  },
  {
    id: 'patisserie-rose',
    author: 'Karim Ben Salah',
    city: 'Sfax',
    quote: {
      fr: 'La demande d’addition arrive direct sur le téléphone des serveurs, avec son et vibration. On gagne deux à trois minutes par table le soir — multiplié par trente, ça change la soirée.',
      ar: 'طلب الفاتورة يوصل مباشرة لتليفون الجرسون بالصوت والاهتزاز. نربحوا دقيقتين ولا ثلاث على كل طاولة في الليل — إضرب في ثلاثين، يتبدّل السهر كامل.',
      en: 'The bill request lands on the waiter’s phone with sound and vibration. We save two to three minutes a table at dinner — times thirty, it changes the whole shift.',
    },
    role: {
      fr: 'Patron, pâtisserie & salon de thé',
      ar: 'صاحب حلويات وصالون شاي',
      en: 'Owner, pastry shop & tea room',
    },
  },
];
