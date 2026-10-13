import { MAX_MILLIMES, assertMillimes } from '@/lib/money';
import type { PublicProduct } from '../schemas/public-menu';
import { effectiveOptionGroup } from './options';
import type { ValidSelection } from './selection';

export const MAX_QUANTITY = 99;

/**
 * Price of one order line in millimes: (base price + chosen option prices) × quantity.
 * Integer maths only (CLAUDE.md rule 1); the server recomputes it from DB prices (rule 4).
 */
export function computeLinePrice(
  product: Pick<PublicProduct, 'price'>,
  selection: ValidSelection,
  quantity: number,
): number {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new RangeError(`Quantity must be an integer between 1 and ${String(MAX_QUANTITY)}`);
  }
  const unit = selection.options.reduce((sum, option) => sum + option.price, product.price);
  const total = unit * quantity;
  assertMillimes(total);
  return total;
}

/** Order total: the sum of line prices, guarded against overflow. */
export function computeOrderTotal(linePrices: readonly number[]): number {
  const total = linePrices.reduce((sum, price) => {
    assertMillimes(price);
    return sum + price;
  }, 0);
  assertMillimes(total);
  return total;
}

export interface DisplayPrice {
  /** Lowest price a customer can pay for one unit with the required choices. */
  amount: number;
  /** "À partir de / from / ابتداءً من": a required choice changes the price (ADR-0014 §7). */
  from: boolean;
}

/**
 * Price shown on the menu card: base price plus the cheapest available way to satisfy every
 * required group. `from` is set when a required group offers different prices.
 */
export function displayPrice(
  product: Pick<PublicProduct, 'price' | 'option_groups'>,
): DisplayPrice {
  let amount = product.price;
  let from = false;
  for (const group of product.option_groups.map(effectiveOptionGroup)) {
    if (!group.required) continue;
    const prices = group.options
      .filter((option) => option.isAvailable)
      .map((option) => option.price)
      .sort((a, b) => a - b);
    amount += prices.slice(0, group.minSelect).reduce((sum, price) => sum + price, 0);
    if (new Set(prices).size > 1) from = true;
  }
  return { amount: Math.min(amount, MAX_MILLIMES), from };
}

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
