import uFuzzy from '@leeoniya/ufuzzy';
import type { PublicMenu } from '../schemas/public-menu';

const TATWEEL = String.fromCharCode(0x0640);
const ARABIC_LETTERS: Readonly<Record<string, string>> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ة: 'ه',
  ى: 'ي',
  ؤ: 'و',
  ئ: 'ي',
};

/** Arabic-Indic (U+0660–0669) and Eastern Arabic-Indic (U+06F0–06F9) digits → Latin. */
function latinDigit(char: string): string {
  const code = char.charCodeAt(0);
  return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
}

/**
 * Search normalisation (ADR-0026 §5), applied to the menu and the query alike: lowercase,
 * Latin diacritics and Arabic tashkeel removed (combining marks), tatweel removed, Arabic
 * letter variants unified (أ/إ/آ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي), digits made Latin, ligatures
 * expanded, whitespace collapsed. Script-independent, so mixed FR/AR queries work.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll(TATWEEL, '')
    .replace(/[أإآٱةىؤئ]/g, (char) => ARABIC_LETTERS[char] ?? char)
    .replace(/[\u0660-\u0669\u06f0-\u06f9]/g, latinDigit)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Phonetic key of a Latin word for derja spellings ("kapsin" ≈ "capucin"): c/k/q/s/z merge,
 * ph → f, vowels after the first letter dropped, repeats collapsed. Used only when the
 * typo-tolerant match finds nothing.
 */
export function phoneticKey(word: string): string {
  const merged = word
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'k')
    .replace(/[cqsz]/g, 'k');
  const head = merged.slice(0, 1);
  const tail = merged.slice(1).replace(/[aeiouy]/g, '');
  return (head + tail).replace(/(.)\1+/g, '$1');
}

const LATIN_WORD = /^[a-z]+$/;

export interface SearchIndex {
  ids: string[];
  haystack: string[];
  /** Phonetic keys of each entry's Latin words. */
  keys: string[][];
}

/** One entry per product: its names and its category names in every language. */
export interface SearchEntry {
  id: string;
  /** Every language of the product and category names (`get_public_menu` `search`). */
  search: string;
}

/** Search entries of a menu, in menu order. */
export function searchEntries(menu: Pick<PublicMenu, 'categories'>): SearchEntry[] {
  return menu.categories.flatMap((category) =>
    category.products.map((product) => ({ id: product.id, search: product.search })),
  );
}

/** One index entry per product, built on the client when search opens. */
export function buildSearchIndex(entries: readonly SearchEntry[]): SearchIndex {
  const haystack = entries.map((entry) => normalizeForSearch(entry.search));
  return {
    ids: entries.map((entry) => entry.id),
    haystack,
    keys: haystack.map((text) =>
      text
        .split(' ')
        .filter((word) => LATIN_WORD.test(word))
        .map(phoneticKey),
    ),
  };
}

const fuzzy = new uFuzzy({
  unicode: true,
  interSplit: String.raw`[^\p{L}\d']+`,
  intraSplit: String.raw`\p{Ll}\p{Lu}`,
  intraBound: String.raw`\p{L}\d|\d\p{L}|\p{Ll}\p{Lu}`,
  intraChars: String.raw`[\p{L}\d']`,
  intraContr: String.raw`'\p{L}{1,2}\b`,
  // One typo per term: insertion, substitution, transposition or omission.
  // uFuzzy.IntraMode.SingleError; the ambient const enum is unreachable under isolatedModules.
  intraMode: 1 as uFuzzy.IntraMode,
  intraIns: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

/** Phonetic keys shorter than this match too broadly ("zzzz" → "k"). */
const MIN_PHONETIC_KEY = 3;

/**
 * Product ids matching `query`, best first: a word starting with the query, then the query
 * inside a word, then typo-tolerant matches (uFuzzy); phonetic matches for Latin spellings of
 * derja only when nothing else matched.
 */
export function searchMenu(index: SearchIndex, query: string): string[] {
  const needle = normalizeForSearch(query);
  if (needle.length < 2) return [];

  const matched = fuzzy.filter(index.haystack, needle) ?? [];
  if (matched.length > 0) {
    const tier = (i: number) => {
      const entry = index.haystack[i] ?? '';
      if (entry.split(' ').some((word) => word.startsWith(needle))) return 0;
      return entry.includes(needle) ? 1 : 2;
    };
    return matched
      .map((i, order) => ({ i, order, tier: tier(i) }))
      .sort((a, b) => a.tier - b.tier || a.order - b.order)
      .map(({ i }) => index.ids[i] ?? '');
  }

  const queryKeys = needle
    .split(' ')
    .filter((word) => LATIN_WORD.test(word))
    .map(phoneticKey)
    .filter((key) => key.length >= MIN_PHONETIC_KEY);
  if (queryKeys.length === 0) return [];
  return index.ids.filter((_, i) =>
    queryKeys.every((key) => (index.keys[i] ?? []).some((word) => word.startsWith(key))),
  );
}
