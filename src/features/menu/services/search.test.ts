import { describe, expect, it } from 'vitest';
import type { PublicMenu } from '../schemas/public-menu';
import { id, product, text } from '../testing/fixtures';
import { buildSearchIndex, normalizeForSearch, phoneticKey, searchMenu } from './search';

const ITEMS = {
  capucin: { id: id(1), search: 'Capucin كابوسان Capucin Cafés القهوة Coffee' },
  direct: { id: id(2), search: 'Direct قهوة ديراكت Direct (milky coffee) Cafés القهوة Coffee' },
  turc: { id: id(3), search: 'Café turc قهوة تركية Turkish coffee Cafés القهوة Coffee' },
  caramel: {
    id: id(4),
    search: 'Crème caramel كريم كراميل Crème caramel Desserts حلويات Desserts',
  },
  creponne: {
    id: id(5),
    search: 'Crêpe chocolat كريب بالشوكولاتة Chocolate crêpe Crêpes كريب Crêpes',
  },
  citronnade: {
    id: id(6),
    search: 'Citronnade عصير الليمون Tunisian lemonade Boissons مشروبات Drinks',
  },
  makroudh: { id: id(7), search: 'Makroudh مقروض Makroudh Douceurs حلويات Sweets' },
};

const menu: Pick<PublicMenu, 'categories'> = {
  categories: [
    {
      id: id(100),
      name: text('Tout'),
      icon: null,
      media: null,
      availability: null,
      products: Object.values(ITEMS).map((item) => product({ id: item.id, search: item.search })),
    },
  ],
};
const index = buildSearchIndex(menu);
const search = (query: string) => searchMenu(index, query);

describe('normalizeForSearch', () => {
  it('lowercases and strips Latin diacritics and ligatures', () => {
    expect(normalizeForSearch('Crème Brûlée')).toBe('creme brulee');
    expect(normalizeForSearch('ŒUF')).toBe('oeuf');
  });

  it('unifies Arabic letter variants and removes tashkeel and tatweel', () => {
    expect(normalizeForSearch('قَهْوَة')).toBe('قهوه');
    expect(normalizeForSearch('أإآى')).toBe('اااي');
    expect(normalizeForSearch('مؤئ')).toBe('موي');
    expect(normalizeForSearch(`ق${String.fromCharCode(0x0640)}هوة`)).toBe('قهوه');
  });

  it('converts Arabic-Indic digits and collapses punctuation', () => {
    expect(normalizeForSearch('عصير ٢ - ۳')).toBe('عصير 2 3');
    expect(normalizeForSearch('  Eau  minérale, 0,5 L ')).toBe('eau minerale 0 5 l');
  });
});

describe('phoneticKey', () => {
  it('groups derja spellings of the same word', () => {
    expect(phoneticKey('kapsin')).toBe(phoneticKey('capucin'));
    expect(phoneticKey('makroud')).toBe(phoneticKey('makroudh').slice(0, 4));
    expect(phoneticKey('pharmacie')).toBe('frmk');
  });
});

describe('searchMenu (ADR-0026 acceptance terms)', () => {
  it('finds exact and accent-insensitive names', () => {
    expect(search('capucin')).toEqual([ITEMS.capucin.id]);
    // "crêpe" is one typo away; the exact word ranks first.
    expect(search('crème')[0]).toBe(ITEMS.caramel.id);
    expect(search('creme')[0]).toBe(ITEMS.caramel.id);
  });

  it('finds Arabic terms with ة or ه', () => {
    const coffees = [ITEMS.capucin.id, ITEMS.direct.id, ITEMS.turc.id];
    expect(search('قهوة').sort()).toEqual([...coffees].sort());
    expect(search('قهوه').sort()).toEqual([...coffees].sort());
  });

  it('tolerates one typo per word', () => {
    expect(search('capuicn')).toContain(ITEMS.capucin.id);
    expect(search('citronade')).toContain(ITEMS.citronnade.id);
  });

  it('falls back to phonetic matches for derja spellings', () => {
    expect(search('kapsin')).toEqual([ITEMS.capucin.id]);
  });

  it('matches across scripts and ranks word prefixes first', () => {
    expect(search('ليمون')).toEqual([ITEMS.citronnade.id]);
    expect(search('cr').sort()).toEqual([ITEMS.caramel.id, ITEMS.creponne.id].sort());
    expect(search('crep')[0]).toBe(ITEMS.creponne.id);
  });

  it('ignores queries shorter than two characters or without matches', () => {
    expect(search('')).toEqual([]);
    expect(search('c')).toEqual([]);
    expect(search('zzzz')).toEqual([]);
    expect(search('--')).toEqual([]);
  });
});
