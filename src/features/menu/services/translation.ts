import { LOCALES, type Locale } from '@/i18n/locales';
import type { LocalizedText } from '../schemas/public-menu';

/** Stored multilingual text (ADR-0026): any subset of fr / ar / en. */
export type I18nText = Partial<Record<Locale, string>>;

/**
 * Picks the text to show (ADR-0026 §3): requested locale → restaurant default → first
 * non-blank in fr, ar, en order. Returns the language actually used, so the UI can set
 * `lang` (font and direction) on fallback text. Mirrors SQL `i18n_pick`.
 */
export function pickTranslation(
  value: I18nText,
  locale: Locale,
  fallback: Locale,
): LocalizedText | null {
  for (const lang of [locale, fallback, ...LOCALES]) {
    const text = value[lang];
    if (text !== undefined && text.trim() !== '') return { text, lang };
  }
  return null;
}
