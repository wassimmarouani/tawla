import { describe, expect, it } from 'vitest';
import { MAX_MILLIMES } from '@/lib/money';
import { group, id, product } from '../testing/fixtures';
import {
  MAX_QUANTITY,
  ROUNDING_STEPS,
  applyPercentage,
  computeLinePrice,
  computeOrderTotal,
  displayPrice,
} from './pricing';
import { validateSelection, type ValidSelection } from './selection';

function selected(...prices: number[]): ValidSelection {
  return {
    options: prices.map((price, index) => ({
      id: id(index + 1),
      groupId: id(100),
      name: { text: 'x', lang: 'fr' as const },
      price,
      isAvailable: true,
    })),
  };
}

describe('computeLinePrice', () => {
  it('adds option prices to the base price and multiplies by quantity', () => {
    expect(computeLinePrice({ price: 7500 }, selected(1000, 1500), 2)).toBe(20_000);
    expect(computeLinePrice({ price: 2200 }, selected(), 1)).toBe(2200);
  });

  it('rejects invalid quantities', () => {
    for (const quantity of [0, -1, 1.5, MAX_QUANTITY + 1, Number.NaN]) {
      expect(() => computeLinePrice({ price: 100 }, selected(), quantity)).toThrow(RangeError);
    }
  });

  it('rejects totals beyond the money ceiling', () => {
    expect(() => computeLinePrice({ price: MAX_MILLIMES }, selected(1), 1)).toThrow(RangeError);
  });

  it('prices a validated selection with overrides', () => {
    const juice = product({
      price: 4500,
      option_groups: [
        group(1, [{ price: 0 }, { price: 1000 }], {
          min_select: 1,
          max_select: 1,
          price_overrides: { [id(1012)]: 2000 },
        }),
      ],
    });
    const result = validateSelection(juice, [id(1012)]);
    if (!result.ok) throw new Error('expected a valid selection');
    expect(computeLinePrice(juice, result.selection, 3)).toBe(19_500);
  });
});

describe('computeOrderTotal', () => {
  it('sums line prices', () => {
    expect(computeOrderTotal([2200, 20_000, 0])).toBe(22_200);
    expect(computeOrderTotal([])).toBe(0);
  });

  it('rejects invalid lines and overflow', () => {
    expect(() => computeOrderTotal([1.5])).toThrow(RangeError);
    expect(() => computeOrderTotal([MAX_MILLIMES, 1])).toThrow(RangeError);
  });

  it('property: totals are integers ≥ 0 for random valid orders', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let run = 0; run < 500; run += 1) {
      const lines = Array.from({ length: 1 + Math.floor(random() * 8) }, () => {
        const options = Array.from({ length: Math.floor(random() * 4) }, () =>
          Math.floor(random() * 5000),
        );
        const quantity = 1 + Math.floor(random() * MAX_QUANTITY);
        return computeLinePrice(
          { price: Math.floor(random() * 50_000) },
          selected(...options),
          quantity,
        );
      });
      const total = computeOrderTotal(lines);
      expect(Number.isInteger(total)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('displayPrice', () => {
  it('shows the base price when no required group changes it', () => {
    expect(displayPrice(product({ price: 2200 }))).toEqual({ amount: 2200, from: false });
    const sugar = group(1, [{}, {}], { min_select: 1, max_select: 1 });
    const extras = group(2, [{ price: 1000 }], { min_select: 0, max_select: 3 });
    expect(displayPrice(product({ price: 7500, option_groups: [sugar, extras] }))).toEqual({
      amount: 7500,
      from: false,
    });
  });

  it('shows "from" the cheapest available required choice', () => {
    const size = group(1, [{ price: 500, available: false }, { price: 1000 }, { price: 2000 }], {
      min_select: 1,
      max_select: 1,
    });
    expect(displayPrice(product({ price: 4500, option_groups: [size] }))).toEqual({
      amount: 5500,
      from: true,
    });
  });

  it('adds the cheapest choices when several are required', () => {
    const flavours = group(1, [{ price: 0 }, { price: 500 }, { price: 0 }], {
      min_select: 1,
      max_select: 3,
      override_min_select: 2,
      override_max_select: 2,
    });
    expect(displayPrice(product({ price: 6000, option_groups: [flavours] }))).toEqual({
      amount: 6000,
      from: true,
    });
  });
});

describe('applyPercentage', () => {
  it.each([
    [2200, 10, 100, 2400],
    [2200, -10, 100, 2000],
    [2250, 0, 100, 2300],
    [2249, 0, 100, 2200],
    [3333, 7.5, 10, 3580],
    [1000, -100, 100, 0],
    [0, 50, 100, 0],
    [4500, 12, 500, 5000],
    [4500, 12, 1000, 5000],
    [4500, 12, 50, 5050],
  ] as const)('%i millimes %d%% step %i → %i', (price, percent, step, expected) => {
    expect(applyPercentage(price, percent, step)).toBe(expected);
  });

  it('defaults to the 100-millime step', () => {
    expect(applyPercentage(2200, 10)).toBe(2400);
  });

  it('always returns integers ≥ 0 on the chosen step', () => {
    for (const step of ROUNDING_STEPS) {
      for (let price = 0; price <= 20_000; price += 777) {
        for (const percent of [-37.5, -5, 3.3, 15, 120]) {
          const result = applyPercentage(price, percent, step);
          expect(Number.isInteger(result)).toBe(true);
          expect(result % step).toBe(0);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('rejects invalid input', () => {
    expect(() => applyPercentage(1.5, 10)).toThrow(RangeError);
    expect(() => applyPercentage(1000, -101)).toThrow(RangeError);
    expect(() => applyPercentage(1000, Number.NaN)).toThrow(RangeError);
    expect(() => applyPercentage(MAX_MILLIMES, 1000)).toThrow(RangeError);
  });
});
