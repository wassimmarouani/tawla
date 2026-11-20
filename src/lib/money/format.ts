/**
 * Money formatting (ADR-0026). Amounts are integer millimes (1 DT = 1000 millimes).
 * Pure integer arithmetic: never converts to a floating-point dinar value.
 */

export type MoneyLocale = 'fr' | 'ar' | 'en';

/** Largest amount accepted anywhere in the app: 999 999,999 DT. */
export const MAX_MILLIMES = 999_999_999;

const NBSP = '\u00A0';
const NARROW_NBSP = '\u202F';
const FIRST_STRONG_ISOLATE = '\u2068';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

interface LocaleStyle {
  decimal: string;
  group: string;
  wrap: (number: string) => string;
}

const STYLES: Record<MoneyLocale, LocaleStyle> = {
  fr: { decimal: ',', group: NARROW_NBSP, wrap: (n) => `${n}${NBSP}DT` },
  ar: {
    decimal: '.',
    group: ',',
    wrap: (n) => `${FIRST_STRONG_ISOLATE}${n}${NBSP}د.ت${POP_DIRECTIONAL_ISOLATE}`,
  },
  en: { decimal: '.', group: ',', wrap: (n) => `TND${NBSP}${n}` },
};

export function assertMillimes(value: number): void {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_MILLIMES) {
    throw new RangeError(`Invalid millimes amount: ${String(value)}`);
  }
}

function groupDigits(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatNumber(millimes: number, style: LocaleStyle): string {
  const absolute = Math.abs(millimes);
  const dinars = Math.trunc(absolute / 1000);
  const rest = absolute % 1000;
  const number = `${groupDigits(String(dinars), style.group)}${style.decimal}${String(rest).padStart(3, '0')}`;
  return millimes < 0 ? `-${number}` : number;
}

/** `3500` → `3,500 DT` (fr) · `3.500 د.ت` (ar, isolated) · `TND 3.500` (en). */
export function formatMoney(millimes: number, locale: MoneyLocale): string {
  assertMillimes(millimes);
  const style = STYLES[locale];
  return style.wrap(formatNumber(millimes, style));
}

/**
 * Context-aware money formatter (redesign). Wraps {@link formatMoney} with per-surface rules:
 * - `menu` / `console`: always three decimals, exactly like {@link formatMoney}
 *   (console is rendered with `tabular-nums` by the caller, e.g. `<PriceTag>`).
 * - `marketing`: drops the millimes when they are zero, so a round plan price reads
 *   `39 DT` instead of `39,000 DT`; non-round amounts keep all three decimals.
 */
export type MoneyContext = 'menu' | 'marketing' | 'console';

export function formatTND(
  millimes: number,
  { context, locale }: { context: MoneyContext; locale: MoneyLocale },
): string {
  assertMillimes(millimes);
  const style = STYLES[locale];
  if (context === 'marketing' && millimes % 1000 === 0) {
    const dinars = groupDigits(String(Math.abs(millimes) / 1000), style.group);
    return style.wrap(millimes < 0 ? `-${dinars}` : dinars);
  }
  return style.wrap(formatNumber(millimes, style));
}

/** Signed variant for option price deltas: `+1,500 DT`, `-0,500 DT`. Zero renders without a sign. */
export function formatMoneyDelta(millimes: number, locale: MoneyLocale): string {
  assertMillimes(millimes);
  const style = STYLES[locale];
  const number = formatNumber(millimes, style);
  return style.wrap(millimes > 0 ? `+${number}` : number);
}
