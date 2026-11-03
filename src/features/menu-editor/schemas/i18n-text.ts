import { z } from 'zod';
import { LOCALES, type Locale } from '@/i18n/locales';

/** Multilingual text as edited (ADR-0026): one string per locale, blank when missing. */
export type I18nDraft = Record<Locale, string>;
/** Multilingual text as stored: blank locales are dropped (`is_i18n_text` in SQL). */
export type I18nText = Partial<Record<Locale, string>>;

/**
 * Edited multilingual text → stored shape. `required` demands at least one non-blank locale;
 * errors are message keys (`required`, `tooLong`) for the form's translator.
 */
export function i18nTextSchema(maxLength: number, required: boolean) {
  const value = z.string().trim().max(maxLength, 'tooLong').optional();
  return z
    .object({ fr: value, ar: value, en: value })
    .transform((draft): I18nText => {
      const text: I18nText = {};
      for (const locale of LOCALES) {
        const entry = draft[locale];
        if (entry) text[locale] = entry;
      }
      return text;
    })
    .refine((text) => !required || Object.keys(text).length > 0, { message: 'required' });
}

/** Stored or partially edited text → draft (missing locales become blank fields). */
export function toDraft(text: Partial<Record<Locale, string | undefined>>): I18nDraft {
  return { fr: text.fr ?? '', ar: text.ar ?? '', en: text.en ?? '' };
}

/** `jsonb` read back from the database: unknown keys and non-strings are dropped. */
export const storedI18nSchema = z
  .record(z.string(), z.unknown())
  .transform((value): I18nText => {
    const text: I18nText = {};
    for (const locale of LOCALES) {
      const entry = value[locale];
      if (typeof entry === 'string' && entry.trim() !== '') text[locale] = entry;
    }
    return text;
  })
  .catch({});
