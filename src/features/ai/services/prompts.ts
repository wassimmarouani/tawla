import type { Locale } from '@/i18n/locales';
import type { RawTranslations } from '../schemas/translations';
import type { TranslationSource } from '../schemas/translations';

/**
 * Prompt builders (ADR-0025 §4): inputs are menu content only (names, descriptions, glossary
 * terms). Nothing about customers, orders or staff can reach a prompt: the builders accept no
 * such fields, and the unit tests pin the exact inputs.
 */

const LANGUAGE_NAMES: Record<Locale, string> = {
  fr: 'French',
  ar: 'Modern Standard Arabic',
  en: 'English',
};

export function extractionPrompt(): string {
  return [
    'You read photos of a Tunisian café or restaurant menu (printed, handwritten, chalkboard).',
    'Extract every category and every item exactly as written, in the original language.',
    'Rules:',
    '- Keep names and descriptions verbatim; do not translate, do not invent.',
    '- "price" is the price text exactly as printed for the base size (e.g. "3,500", "3.5 DT",',
    '  "12 000"), or null if absent or unreadable. Never convert or compute prices.',
    '- When an item lists several sizes, keep the smallest price in "price" and mention the',
    '  sizes in "description".',
    '- Items printed before any heading go into a category named after the menu section you',
    '  infer (e.g. "Boissons").',
    '- "confidence" is low when the text or price is hard to read, medium when unsure, high',
    '  otherwise.',
    '- Ignore prices of anything that is not a menu item (phone numbers, opening hours).',
  ].join('\n');
}

export function translationPrompt(
  items: readonly TranslationSource[],
  targets: readonly Locale[],
  glossary: readonly { term: string; translations: Partial<Record<Locale, string>> }[],
): string {
  const lines = [
    'Translate menu items of a Tunisian café or restaurant.',
    `Target languages: ${targets.map((locale) => `${locale} (${LANGUAGE_NAMES[locale]})`).join(', ')}.`,
    'For each item and each target language it is missing, return one entry with the item id,',
    'the locale, the translated name and the translated description (null when the item has none).',
    'Rules:',
    '- Short, natural menu wording; keep dish names that are proper names (e.g. "Lablebi",',
    '  "Kafteji", "Bambalouni") transliterated, not explained.',
    '- Keep units, sizes and numbers unchanged. Never add allergens, prices or claims.',
  ];
  if (glossary.length > 0) {
    lines.push('Glossary (always use these exact translations; "=" means keep as is):');
    for (const entry of glossary) {
      const known = Object.entries(entry.translations)
        .map(([locale, value]) => `${locale}: ${value}`)
        .join('; ');
      lines.push(`- ${entry.term} → ${known || '='}`);
    }
  }
  lines.push('Items (JSON):', JSON.stringify(items));
  return lines.join('\n');
}

/** Keeps only suggestions for requested items and locales that were actually missing. */
export function usefulSuggestions(
  raw: RawTranslations,
  items: readonly TranslationSource[],
  targets: readonly Locale[],
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  return raw.items.filter((suggestion) => {
    const item = byId.get(suggestion.id);
    const key = `${suggestion.id}:${suggestion.locale}`;
    if (!item || !targets.includes(suggestion.locale) || seen.has(key)) return false;
    if (item.name[suggestion.locale]?.trim()) return false;
    seen.add(key);
    return true;
  });
}
