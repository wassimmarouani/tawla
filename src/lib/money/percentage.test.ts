import { describe, expect, it } from 'vitest';
import { MAX_MILLIMES } from './format';
import { ROUNDING_STEPS, applyPercentage } from './percentage';

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
