import { describe, expect, it } from 'vitest';
import { adjustPrice, parsePercent, previewPriceChanges } from './bulk-price';

const MAX = 10_000_000;

describe('adjustPrice', () => {
  it.each([
    // price, basis points, step, expected
    [3500, 1000, 100, 3900], // 3.850 → 3.900 (half up)
    [3500, 1000, 10, 3850],
    [3500, 1000, 1000, 4000],
    [2000, -1000, 100, 1800],
    [2250, 1000, 100, 2500], // 2.475 → 2.500
    [2200, 1000, 100, 2400], // 2.420 → 2.400
    [1450, 0, 100, 1500], // rounding alone
    [1449, 0, 100, 1400],
    [999, 1250, 50, 1100], // 1.123 75 → 1.100
    [5000, 2500, 500, 6500], // 6.250 → 6.500 (half up)
  ] as const)('%i %+i bp step %i → %i', (price, basisPoints, step, expected) => {
    expect(adjustPrice(price, basisPoints, step, MAX)).toBe(expected);
  });

  it('keeps free products free', () => {
    expect(adjustPrice(0, 2000, 100, MAX)).toBe(0);
  });

  it('never turns a paid product free', () => {
    expect(adjustPrice(300, -9000, 1000, MAX)).toBe(300);
    expect(adjustPrice(2000, -9000, 1000, MAX)).toBe(1000);
  });

  it('caps the result', () => {
    expect(adjustPrice(9_900_000, 2000, 100, MAX)).toBe(MAX);
  });

  it('stays exact on large integers', () => {
    expect(adjustPrice(9_999_990, 20_000, 10, Number.MAX_SAFE_INTEGER)).toBe(29_999_970);
  });
});

describe('previewPriceChanges', () => {
  it('reports every item in order', () => {
    expect(
      previewPriceChanges(
        [
          { id: 'a', price: 3500 },
          { id: 'b', price: 0 },
        ],
        1000,
        100,
        MAX,
      ),
    ).toEqual([
      { id: 'a', before: 3500, after: 3900 },
      { id: 'b', before: 0, after: 0 },
    ]);
  });
});

describe('parsePercent', () => {
  it.each([
    ['10', 1000],
    ['+10', 1000],
    ['-5', -500],
    ['7,5', 750],
    ['12.25 %', 1225],
    [' -0,5% ', -50],
    ['200', 20_000],
  ])('%s → %i', (input, expected) => {
    expect(parsePercent(input)).toBe(expected);
  });

  it.each(['', 'abc', '1.234', '10 DT', '1000', '--5'])('rejects %s', (input) => {
    expect(parsePercent(input)).toBeNull();
  });
});
