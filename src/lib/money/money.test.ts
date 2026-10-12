import { describe, expect, it } from 'vitest';
import { MAX_MILLIMES, assertMillimes, formatMoney, formatMoneyDelta, parseMoneyInput } from '.';

const NBSP = '\u00A0';
const NNBSP = '\u202F';
const ar = (text: string) => `\u2068${text}\u2069`;

describe('formatMoney', () => {
  it.each([
    [3500, 'fr', `3,500${NBSP}DT`],
    [12500, 'fr', `12,500${NBSP}DT`],
    [0, 'fr', `0,000${NBSP}DT`],
    [50, 'fr', `0,050${NBSP}DT`],
    [1_250_000, 'fr', `1${NNBSP}250,000${NBSP}DT`],
    [999_999_999, 'fr', `999${NNBSP}999,999${NBSP}DT`],
    [3500, 'ar', ar(`3.500${NBSP}د.ت`)],
    [12500, 'ar', ar(`12.500${NBSP}د.ت`)],
    [1_250_000, 'ar', ar(`1,250.000${NBSP}د.ت`)],
    [3500, 'en', `TND${NBSP}3.500`],
    [12500, 'en', `TND${NBSP}12.500`],
    [1_250_000, 'en', `TND${NBSP}1,250.000`],
    [-1500, 'fr', `-1,500${NBSP}DT`],
  ] as const)('formats %i millimes in %s', (millimes, locale, expected) => {
    expect(formatMoney(millimes, locale)).toBe(expected);
  });

  it('never uses floating-point dinars (no rounding drift)', () => {
    for (let millimes = 0; millimes < 5000; millimes += 7) {
      const text = formatMoney(millimes, 'en');
      expect(text.endsWith(String(millimes % 1000).padStart(3, '0'))).toBe(true);
    }
  });

  it.each([1.5, Number.NaN, Infinity, MAX_MILLIMES + 1, -MAX_MILLIMES - 1])(
    'rejects invalid amount %s',
    (value) => {
      expect(() => formatMoney(value, 'fr')).toThrow(RangeError);
      expect(() => {
        assertMillimes(value);
      }).toThrow(RangeError);
    },
  );
});

describe('formatMoneyDelta', () => {
  it('signs positive deltas and leaves zero unsigned', () => {
    expect(formatMoneyDelta(1500, 'fr')).toBe(`+1,500${NBSP}DT`);
    expect(formatMoneyDelta(-500, 'en')).toBe(`TND${NBSP}-0.500`);
    expect(formatMoneyDelta(0, 'fr')).toBe(`0,000${NBSP}DT`);
    expect(formatMoneyDelta(2000, 'ar')).toBe(ar(`+2.000${NBSP}د.ت`));
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['3', 3000],
    ['3,5', 3500],
    ['3.5', 3500],
    ['3.500', 3500],
    ['3,500 DT', 3500],
    ['TND 12.5', 12500],
    ['  0,05 ', 50],
    ['1 250,000', 1_250_000],
    [`1${NNBSP}250,000${NBSP}DT`, 1_250_000],
    ['1,250.000', 1_250_000],
    ['1.250.000', 1_250_000],
    ['١٢٫٥', 12500],
    ['۳٫۵', 3500],
    ['3.500 د.ت', 3500],
    ['0', 0],
  ])('parses %j as %i', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '3,', ',5', '3.5555', '-3', '3..5', '1e3', '999999999,999'])(
    'rejects %j',
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it('round-trips with formatMoney', () => {
    for (const millimes of [0, 1, 50, 999, 1000, 3500, 12_345, 1_250_000, MAX_MILLIMES]) {
      for (const locale of ['fr', 'ar', 'en'] as const) {
        expect(parseMoneyInput(formatMoney(millimes, locale))).toBe(millimes);
      }
    }
  });
});
