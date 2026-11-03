import { describe, expect, it } from 'vitest';
import { displayText, missingLocales, productSlug, sortOrders } from './menu-text';

describe('missingLocales', () => {
  it('lists enabled locales without text, blank counting as missing', () => {
    expect(missingLocales({ fr: 'Café', ar: '  ' }, ['fr', 'ar', 'en'])).toEqual(['ar', 'en']);
    expect(missingLocales({ fr: 'Café' }, ['fr'])).toEqual([]);
  });
});

describe('displayText', () => {
  it('follows locale → default → fr, ar, en', () => {
    expect(displayText({ fr: 'Thé', ar: 'شاي' }, 'ar', 'fr')).toBe('شاي');
    expect(displayText({ fr: 'Thé' }, 'en', 'fr')).toBe('Thé');
    expect(displayText({ ar: 'شاي', en: 'Tea' }, 'fr', 'en')).toBe('Tea');
    expect(displayText({ ar: 'شاي' }, 'fr', 'fr')).toBe('شاي');
    expect(displayText({}, 'fr', 'fr')).toBe('');
  });
});

describe('productSlug', () => {
  it('uses the French name, then English, then a fallback', () => {
    expect(productSlug({ fr: 'Café crème', en: 'Latte' }, new Set())).toBe('cafe-creme');
    expect(productSlug({ ar: 'شاي', en: 'Mint tea' }, new Set())).toBe('mint-tea');
    expect(productSlug({ ar: 'شاي' }, new Set())).toBe('item');
  });

  it('suffixes taken slugs', () => {
    expect(productSlug({ fr: 'Thé' }, new Set(['the']))).toBe('the-2');
    expect(productSlug({ fr: 'Thé' }, new Set(['the', 'the-2']))).toBe('the-3');
    expect(productSlug({ ar: 'شاي' }, new Set(['item']))).toBe('item-2');
  });

  it('keeps suffixed slugs within 80 characters', () => {
    const long = 'a'.repeat(80);
    const slug = productSlug({ fr: long }, new Set([long]));
    expect(slug).toBe(`${'a'.repeat(78)}-2`);
    expect(slug).toHaveLength(80);
  });
});

describe('sortOrders', () => {
  it('spaces orders by 10', () => {
    expect(sortOrders(['a', 'b', 'c'])).toEqual([
      { id: 'a', sortOrder: 10 },
      { id: 'b', sortOrder: 20 },
      { id: 'c', sortOrder: 30 },
    ]);
  });
});
