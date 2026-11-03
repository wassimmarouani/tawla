import { assertMillimes } from './format';

/** Rounding steps offered for bulk price changes (ADR-0014 §5), in millimes. */
export const ROUNDING_STEPS = [10, 50, 100, 500, 1000] as const;
export type RoundingStep = (typeof ROUNDING_STEPS)[number];

/**
 * Bulk price change: `price × (1 + percent / 100)`, rounded half up to the nearest `step`
 * (default 100 millimes = 0.100 DT). Percent is resolved to basis points so the maths stays
 * on integers; results never go below 0.
 */
export function applyPercentage(price: number, percent: number, step: RoundingStep = 100): number {
  assertMillimes(price);
  if (!Number.isFinite(percent) || percent < -100 || percent > 1000) {
    throw new RangeError('Percent must be between -100 and 1000');
  }
  const basisPoints = Math.round(percent * 100);
  const scaled = price * (10_000 + basisPoints);
  const unit = 10_000 * step;
  const rounded = Math.floor((2 * scaled + unit) / (2 * unit)) * step;
  const result = Math.max(0, rounded);
  assertMillimes(result);
  return result;
}
