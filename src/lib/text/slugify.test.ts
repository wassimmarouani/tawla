import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

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
    expect(slugify(input, 40)).toBe(expected);
  });

  it('caps the length at 40 without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(39)} bcd`, 40);
    expect(slug).toBe('a'.repeat(39));
    expect(slugify('a'.repeat(50), 40)).toHaveLength(40);
  });
});
