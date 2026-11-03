import { applyPercentage, type RoundingStep } from '@/lib/money';

/** Default step: 0.100 DT (spec 04). */
export const DEFAULT_ROUNDING_STEP: RoundingStep = 100;

/**
 * A price changed by `basisPoints` (+1 000 = +10 %) with the ADR-0014 rounding
 * (`applyPercentage`), plus the editor's guards: a paid product never becomes free (a result
 * below one step keeps the smaller of the price and the step) and `max` caps the result.
 */
export function adjustPrice(
  price: number,
  basisPoints: number,
  step: RoundingStep,
  max: number,
): number {
  if (price === 0) return 0;
  const rounded = applyPercentage(price, basisPoints / 100, step);
  return Math.min(Math.max(rounded, Math.min(price, step)), max);
}

export interface PriceChange {
  id: string;
  before: number;
  after: number;
}

/** Preview of a bulk change, in the given order; unchanged prices are reported too. */
export function previewPriceChanges(
  items: readonly { id: string; price: number }[],
  basisPoints: number,
  step: RoundingStep,
  max: number,
): PriceChange[] {
  return items.map((item) => ({
    id: item.id,
    before: item.price,
    after: adjustPrice(item.price, basisPoints, step, max),
  }));
}

/**
 * Percentage typed by a manager (`10`, `-5`, `7,5`, `+12.25`) → basis points, or `null`.
 * Two decimals at most.
 */
export function parsePercent(input: string): number | null {
  const match = /^\s*([+-]?)(\d{1,3})(?:[.,](\d{1,2}))?\s*%?\s*$/.exec(input);
  if (!match) return null;
  const [, sign = '', whole = '0', fraction = ''] = match;
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return sign === '-' ? -value : value;
}
