import { describe, expect, it } from 'vitest';
import { millimesToDecimal } from './decimal';

describe('millimesToDecimal', () => {
  it.each([
    [0, '0.000'],
    [50, '0.050'],
    [2200, '2.200'],
    [14000, '14.000'],
    [-1500, '-1.500'],
    [999_999_999, '999999.999'],
  ])('%i → %s', (millimes, expected) => {
    expect(millimesToDecimal(millimes)).toBe(expected);
  });

  it('rejects non-integers', () => {
    expect(() => millimesToDecimal(1.5)).toThrow(RangeError);
  });
});
