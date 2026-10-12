import { describe, expect, it } from 'vitest';
import { directionOf, isLocale, negotiateLocale, parseAcceptLanguage } from './locales';

describe('parseAcceptLanguage', () => {
  it('orders primary subtags by quality then position', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9,ar-TN;q=0.95,fr;q=0.8')).toEqual([
      'en',
      'ar',
      'en',
      'fr',
    ]);
    expect(parseAcceptLanguage('de, fr ;q=0.5, *;q=0.1')).toEqual(['de', 'fr']);
  });

  it('ignores empty, wildcard, zero-quality and malformed entries', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
    expect(parseAcceptLanguage('fr;q=0, en;q=abc, ar')).toEqual(['ar']);
  });
});

describe('negotiateLocale', () => {
  it('prefers an explicit cookie choice', () => {
    expect(negotiateLocale({ cookie: 'ar', acceptLanguage: 'en' })).toBe('ar');
  });

  it('falls back to Accept-Language, then the default', () => {
    expect(negotiateLocale({ cookie: 'xx', acceptLanguage: 'de-DE,en;q=0.7' })).toBe('en');
    expect(negotiateLocale({ acceptLanguage: 'ar-TN' })).toBe('ar');
    expect(negotiateLocale({ acceptLanguage: 'de' })).toBe('fr');
    expect(negotiateLocale({})).toBe('fr');
  });

  it('respects the restaurant-enabled subset', () => {
    expect(negotiateLocale({ cookie: 'en', acceptLanguage: 'en', supported: ['fr', 'ar'] })).toBe(
      'fr',
    );
    expect(negotiateLocale({ supported: ['ar', 'en'], fallback: 'fr' })).toBe('ar');
    expect(negotiateLocale({ supported: [], fallback: 'en' })).toBe('fr');
  });
});

describe('locale helpers', () => {
  it('validates locales and directions', () => {
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('fr')).toBe('ltr');
  });
});
