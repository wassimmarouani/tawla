import { describe, expect, it } from 'vitest';
import { i18nTextSchema, storedI18nSchema, toDraft } from './i18n-text';
import { bulkPriceSchema, idsSchema, priceTextSchema, productFormSchema } from './menu-editor';
import { optionGroupFormSchema, optionLinkFormSchema } from './options';

const ID = '00000000-0000-4000-8000-000000000001';

describe('i18nTextSchema', () => {
  it('trims and drops blank locales', () => {
    expect(i18nTextSchema(10, true).parse({ fr: ' Thé ', ar: '  ', en: '' })).toEqual({
      fr: 'Thé',
    });
  });

  it('requires one locale when asked', () => {
    const result = i18nTextSchema(10, true).safeParse({ fr: '', ar: ' ', en: '' });
    expect(result.error?.issues[0]?.message).toBe('required');
    expect(i18nTextSchema(10, false).parse({ fr: '', ar: '', en: '' })).toEqual({});
  });

  it('caps the length per locale', () => {
    const result = i18nTextSchema(3, true).safeParse({ fr: 'abcd' });
    expect(result.error?.issues[0]?.message).toBe('tooLong');
  });

  it('round-trips through the draft shape', () => {
    expect(toDraft({ ar: 'شاي' })).toEqual({ fr: '', ar: 'شاي', en: '' });
  });
});

describe('storedI18nSchema', () => {
  it('keeps known non-blank strings only', () => {
    expect(storedI18nSchema.parse({ fr: 'Thé', ar: '', de: 'Tee', en: 3 })).toEqual({ fr: 'Thé' });
    expect(storedI18nSchema.parse(null)).toEqual({});
  });
});

describe('priceTextSchema', () => {
  it.each([
    ['3,5', 3500],
    ['3.500', 3500],
    ['12', 12_000],
    ['0', 0],
  ])('%s → %i millimes', (input, expected) => {
    expect(priceTextSchema.parse(input)).toBe(expected);
  });

  it.each([
    ['', 'required'],
    ['abc', 'priceInvalid'],
    ['10001', 'priceInvalid'],
  ])('rejects %s with %s', (input, message) => {
    expect(priceTextSchema.safeParse(input).error?.issues[0]?.message).toBe(message);
  });
});

describe('productFormSchema', () => {
  it('turns the typed price into millimes', () => {
    const parsed = productFormSchema.parse({
      categoryId: ID,
      name: { fr: 'Thé', ar: '', en: '' },
      description: { fr: '', ar: '', en: '' },
      price: '2,5',
      mediaId: null,
      isAvailable: true,
      isVisible: true,
      badges: ['new'],
      allergens: [],
      dietary: [],
      optionLinks: [
        {
          optionGroupId: ID,
          minSelect: '',
          maxSelect: '2',
          priceOverrides: { [ID]: '2', '00000000-0000-4000-8000-000000000002': ' ' },
        },
      ],
    });
    expect(parsed).toMatchObject({ name: { fr: 'Thé' }, description: {}, price: 2500 });
    expect(parsed.optionLinks).toEqual([
      { optionGroupId: ID, minSelect: null, maxSelect: 2, priceOverrides: { [ID]: 2000 } },
    ]);
  });
});

describe('batch schemas', () => {
  it('rejects duplicate ids and empty lists', () => {
    expect(idsSchema.safeParse({ ids: [ID, ID] }).success).toBe(false);
    expect(idsSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it('bounds bulk price changes', () => {
    expect(bulkPriceSchema.safeParse({ ids: [ID], basisPoints: 1000, step: 100 }).success).toBe(
      true,
    );
    expect(bulkPriceSchema.safeParse({ ids: [ID], basisPoints: 0, step: 100 }).success).toBe(false);
    expect(bulkPriceSchema.safeParse({ ids: [ID], basisPoints: 1000, step: 7 }).success).toBe(
      false,
    );
    expect(bulkPriceSchema.safeParse({ ids: [ID], basisPoints: -9500, step: 100 }).success).toBe(
      false,
    );
  });
});

describe('option group schemas', () => {
  const option = (name: string, price: string) => ({
    id: null,
    name: { fr: name, ar: '', en: '' },
    priceDelta: price,
    isAvailable: true,
  });

  it('parses counts and prices as typed', () => {
    const parsed = optionGroupFormSchema.parse({
      name: { fr: 'Taille', ar: '', en: '' },
      minSelect: '1',
      maxSelect: '1',
      options: [option('Normal', ''), option('Grand', '1,5')],
    });
    expect(parsed.options.map((entry) => entry.priceDelta)).toEqual([0, 1500]);
  });

  it.each([
    [{ minSelect: '2', maxSelect: '1' }, 'minAboveMax'],
    [{ minSelect: '3', maxSelect: '3' }, 'minAboveOptions'],
    [{ minSelect: 'x', maxSelect: '1' }, 'countInvalid'],
    [{ minSelect: '0', maxSelect: '0' }, 'countInvalid'],
  ])('rejects %o with %s', (counts, message) => {
    const result = optionGroupFormSchema.safeParse({
      name: { fr: 'Taille', ar: '', en: '' },
      ...counts,
      options: [option('A', ''), option('B', '')],
    });
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it('needs at least one option and valid overrides', () => {
    expect(
      optionGroupFormSchema.safeParse({
        name: { fr: 'Vide', ar: '', en: '' },
        minSelect: '0',
        maxSelect: '1',
        options: [],
      }).error?.issues[0]?.message,
    ).toBe('noOptions');
    expect(
      optionLinkFormSchema.safeParse({
        optionGroupId: ID,
        minSelect: '3',
        maxSelect: '1',
        priceOverrides: {},
      }).error?.issues[0]?.message,
    ).toBe('minAboveMax');
  });
});
