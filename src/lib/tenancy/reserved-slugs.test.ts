import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { APP_SEGMENTS, MARKETING_SEGMENTS } from '../routing/resolve-route';
import { RESERVED_SLUGS, isValidSlug } from './reserved-slugs';

describe('reserved slugs', () => {
  it('reserves every routed first segment and locale code', () => {
    for (const segment of [...APP_SEGMENTS, ...MARKETING_SEGMENTS.filter(Boolean), ...LOCALES]) {
      expect(RESERVED_SLUGS.has(segment)).toBe(true);
    }
  });

  it.each(['cafe-el-bahja', 'le-15', 'abc', 'pizzeria-2026'])('accepts %s', (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each([
    'admin',
    'dashboard',
    'pricing',
    'ar',
    't',
    'ab',
    '-cafe',
    'cafe-',
    'Café',
    'cafe_el',
    'cafe.el',
    'a'.repeat(41),
  ])('rejects %s', (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});
