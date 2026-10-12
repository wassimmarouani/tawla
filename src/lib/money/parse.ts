import { MAX_MILLIMES } from './format';

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

function toLatinDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const base =
      code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - base);
  });
}

/**
 * Parses a price typed by a manager into integer millimes, or `null` if invalid.
 *
 * Accepts `3`, `3,5`, `3.500`, `3,500 DT`, `TND 12.5`, `1 250,000`, `١٢\u066B٥`.
 * A single separator is always the decimal separator (Tunisian prices have 3 decimals, so
 * `1,250` means 1.250 DT). With several separators, the last one is decimal and the others group.
 */
export function parseMoneyInput(input: string): number | null {
  const cleaned = toLatinDigits(input)
    .replace(/د\.ت|TND|DT/gi, '')
    .replace(/[\s\u00A0\u202F'\u200E\u200F\u2066-\u2069]/g, '')
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',');

  if (!/^\d+(?:[.,]\d+)*$/.test(cleaned)) return null;

  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const integerPart = lastSeparator === -1 ? cleaned : cleaned.slice(0, lastSeparator);
  const decimalPart = lastSeparator === -1 ? '' : cleaned.slice(lastSeparator + 1);

  if (decimalPart.length > 3) return null;

  const dinars = Number(integerPart.replace(/[.,]/g, ''));
  const millimes = dinars * 1000 + Number(decimalPart.padEnd(3, '0'));

  if (!Number.isSafeInteger(millimes) || millimes > MAX_MILLIMES) return null;
  return millimes;
}
