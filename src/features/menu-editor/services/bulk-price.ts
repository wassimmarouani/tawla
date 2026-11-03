/** Rounding steps offered for bulk price changes, in millimes (0.010 DT to 1 DT). */
export const ROUNDING_STEPS = [10, 50, 100, 500, 1000] as const;
export type RoundingStep = (typeof ROUNDING_STEPS)[number];

/** Default step: 0.100 DT (spec 04). */
export const DEFAULT_ROUNDING_STEP: RoundingStep = 100;

const BASIS = 10_000;

/**
 * A price changed by `basisPoints` (+1 000 = +10 %) and rounded half-up to `step`, in integer
 * millimes only (CLAUDE.md rule 1). A paid product never becomes free: a result below one step
 * keeps the smaller of the price and the step. `max` caps the result.
 */
export function adjustPrice(
  price: number,
  basisPoints: number,
  step: RoundingStep,
  max: number,
): number {
  if (price === 0) return 0;
  const scaled = price * (BASIS + basisPoints);
  const unit = BASIS * step;
  const rounded = Math.floor((2 * scaled + unit) / (2 * unit)) * step;
  const floor = Math.min(price, step);
  return Math.min(Math.max(rounded, floor), max);
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
