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
 * Add an entry once the owner has given consent in writing (email or WhatsApp transcript).
 * The marketing home hides the whole section when this list is empty, so there are no
 * placeholder or invented quotes in production. Three to six quotes is the sweet spot.
 */
export const TESTIMONIALS: readonly Testimonial[] = [];
