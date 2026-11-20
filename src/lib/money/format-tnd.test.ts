import { describe, expect, it } from 'vitest';
import { MAX_MILLIMES, formatTND } from '.';

// Built from char codes to keep the source free of invisible characters (taply lint rule).
const NBSP = String.fromCharCode(0x00a0);
const NNBSP = String.fromCharCode(0x202f);
const DT_AR = String.fromCharCode(0x062f, 0x002e, 0x062a); // د.ت
const ar = (text: string) => String.fromCharCode(0x2068) + text + String.fromCharCode(0x2069);

describe('formatTND', () => {
  describe('menu context (always three decimals)', () => {
    it.each([
      [2500, 'fr', `2,500${NBSP}DT`],
      [2500, 'ar', ar(`2.500${NBSP}${DT_AR}`)],
      [2500, 'en', `TND${NBSP}2.500`],
      [39000, 'fr', `39,000${NBSP}DT`],
      [0, 'fr', `0,000${NBSP}DT`],
      [50, 'fr', `0,050${NBSP}DT`],
    ] as const)('formats %i millimes in %s', (millimes, locale, expected) => {
      expect(formatTND(millimes, { context: 'menu', locale })).toBe(expected);
    });
  });

  describe('console context (always three decimals, like menu)', () => {
    it.each([
      [39000, 'fr', `39,000${NBSP}DT`],
      [1_250_000, 'fr', `1${NNBSP}250,000${NBSP}DT`],
      [1_250_000, 'en', `TND${NBSP}1,250.000`],
    ] as const)('formats %i millimes in %s', (millimes, locale, expected) => {
      expect(formatTND(millimes, { context: 'console', locale })).toBe(expected);
    });
  });

  describe('marketing context (drops zero millimes)', () => {
    it.each([
      [39000, 'fr', `39${NBSP}DT`],
      [39000, 'ar', ar(`39${NBSP}${DT_AR}`)],
      [39000, 'en', `TND${NBSP}39`],
      [1_250_000, 'fr', `1${NNBSP}250${NBSP}DT`],
      [0, 'fr', `0${NBSP}DT`],
    ] as const)('drops millimes for round %i in %s', (millimes, locale, expected) => {
      expect(formatTND(millimes, { context: 'marketing', locale })).toBe(expected);
    });

    it.each([
      [39500, 'fr', `39,500${NBSP}DT`],
      [39050, 'fr', `39,050${NBSP}DT`],
      [39500, 'en', `TND${NBSP}39.500`],
    ] as const)('keeps millimes for non-round %i in %s', (millimes, locale, expected) => {
      expect(formatTND(millimes, { context: 'marketing', locale })).toBe(expected);
    });
  });

  it('matches formatMoney for non-round amounts across all contexts', () => {
    for (const context of ['menu', 'marketing', 'console'] as const) {
      expect(formatTND(2500, { context, locale: 'fr' })).toBe(`2,500${NBSP}DT`);
    }
  });

  it.each([1.5, Number.NaN, Infinity, MAX_MILLIMES + 1, -MAX_MILLIMES - 1])(
    'rejects invalid amount %s',
    (value) => {
      expect(() => formatTND(value, { context: 'menu', locale: 'fr' })).toThrow(RangeError);
    },
  );
});
