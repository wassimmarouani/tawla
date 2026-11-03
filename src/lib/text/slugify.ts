const LIGATURES: Readonly<Record<string, string>> = { œ: 'oe', æ: 'ae', ß: 'ss', ø: 'o', ł: 'l' };

/**
 * Latin slug of a name: accents removed, lowercase, words joined by hyphens, at most `maxLength`
 * characters. Non-Latin scripts (Arabic) produce an empty string; callers choose a fallback.
 */
export function slugify(input: string, maxLength: number): string {
  return input
    .toLowerCase()
    .replace(/[œæßøł]/g, (letter) => LIGATURES[letter] ?? letter)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}
