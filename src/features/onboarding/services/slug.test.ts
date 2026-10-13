import { describe, expect, it } from 'vitest';
import { isAvailableSlugShape, slugCandidates, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Café El Bahja', 'cafe-el-bahja'],
    ['  Le Petit   Déjeuner!! ', 'le-petit-dejeuner'],
    ['Œuf & Bœuf', 'oeuf-boeuf'],
    ['Straße 21', 'strasse-21'],
    ['Smørrebrød Łódź', 'smorrebrod-lodz'],
    ['مقهى البهجة', ''],
    ['Dar مقهى 7', 'dar-7'],
    ['---', ''],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('caps the length at 40 without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(39)} bcd`);
    expect(slug).toBe('a'.repeat(39));
    expect(slugify('a'.repeat(50))).toHaveLength(40);
  });
});

describe('isAvailableSlugShape', () => {
  it('rejects reserved and malformed slugs', () => {
    expect(isAvailableSlugShape('cafe-el-bahja')).toBe(true);
    expect(isAvailableSlugShape('dashboard')).toBe(false);
    expect(isAvailableSlugShape('ab')).toBe(false);
    expect(isAvailableSlugShape('-abc')).toBe(false);
  });
});

describe('slugCandidates', () => {
  it('starts with the name, then appends each suffix', () => {
    expect(slugCandidates('Café El Bahja', 'cafe', ['k3x9', 'p2m7'])).toEqual([
      'cafe-el-bahja',
      'cafe-el-bahja-k3x9',
      'cafe-el-bahja-p2m7',
    ]);
  });

  it('falls back to the venue type for non-Latin or too short names', () => {
    expect(slugCandidates('مقهى البهجة', 'tea_room', ['k3x9'])).toEqual([
      'tea-room',
      'tea-room-k3x9',
    ]);
    expect(slugCandidates('Zé', 'fast_food', [])).toEqual(['fast-food']);
  });

  it('keeps suffixed candidates within 40 characters', () => {
    const [, suffixed] = slugCandidates('a'.repeat(40), 'cafe', ['k3x9']);
    expect(suffixed).toBe(`${'a'.repeat(35)}-k3x9`);
  });

  it('drops reserved names but keeps their suffixed variants', () => {
    expect(slugCandidates('Dashboard', 'cafe', ['k3x9'])).toEqual(['dashboard-k3x9']);
  });

  it('removes duplicates', () => {
    expect(slugCandidates('Café', 'cafe', ['k3x9', 'k3x9'])).toEqual(['cafe', 'cafe-k3x9']);
  });
});
