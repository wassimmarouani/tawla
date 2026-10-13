import { describe, expect, it } from 'vitest';
import { group, id, product } from '../testing/fixtures';
import { validateSelection } from './selection';

// Sugar: required single choice. Extras: optional, up to 2, one sold out.
const sugar = group(1, [{}, {}], { min_select: 1, max_select: 1 });
const extras = group(2, [{ price: 1000 }, { price: 1500 }, { price: 500, available: false }], {
  min_select: 0,
  max_select: 2,
});
const crepe = product({ option_groups: [sugar, extras] });
const SUGAR_1 = id(1011);
const SUGAR_2 = id(1012);
const EXTRA_1 = id(1021);
const EXTRA_2 = id(1022);
const EXTRA_SOLD_OUT = id(1023);

describe('validateSelection', () => {
  it('accepts a valid choice and returns options in menu order with prices', () => {
    const result = validateSelection(crepe, [EXTRA_2, SUGAR_1]);
    expect(result).toEqual({
      ok: true,
      selection: {
        options: [
          expect.objectContaining({ id: SUGAR_1, price: 0, groupId: sugar.id }),
          expect.objectContaining({ id: EXTRA_2, price: 1500, groupId: extras.id }),
        ],
      },
    });
  });

  it('accepts a product without groups and no options', () => {
    expect(validateSelection(product(), [])).toEqual({ ok: true, selection: { options: [] } });
  });

  it('requires the mandatory group', () => {
    expect(validateSelection(crepe, [EXTRA_1])).toEqual({
      ok: false,
      errors: [{ code: 'too_few', groupId: sugar.id, min: 1 }],
    });
  });

  it('enforces the maximum per group', () => {
    const result = validateSelection(crepe, [SUGAR_1, SUGAR_2, EXTRA_1, EXTRA_2]);
    expect(result).toEqual({
      ok: false,
      errors: [{ code: 'too_many', groupId: sugar.id, max: 1 }],
    });
  });

  it('refuses sold-out options, unknown ids and duplicates', () => {
    const stranger = id(9999);
    const result = validateSelection(crepe, [SUGAR_1, EXTRA_SOLD_OUT, stranger, SUGAR_1]);
    expect(result).toEqual({
      ok: false,
      errors: [
        { code: 'unknown_option', optionId: stranger },
        { code: 'duplicate_option', optionId: SUGAR_1 },
        { code: 'option_unavailable', optionId: EXTRA_SOLD_OUT, groupId: extras.id },
      ],
    });
  });

  it('refuses a sold-out product', () => {
    const result = validateSelection({ ...crepe, is_available: false }, [SUGAR_1]);
    expect(result).toEqual({ ok: false, errors: [{ code: 'product_unavailable' }] });
  });

  it('applies product-level overrides (exactly 2 flavours)', () => {
    const flavours = group(3, [{}, {}, {}], {
      min_select: 1,
      max_select: 3,
      override_min_select: 2,
      override_max_select: 2,
    });
    const cup = product({ option_groups: [flavours] });
    expect(validateSelection(cup, [id(1031)]).ok).toBe(false);
    expect(validateSelection(cup, [id(1031), id(1032)]).ok).toBe(true);
    expect(validateSelection(cup, [id(1031), id(1032), id(1033)]).ok).toBe(false);
  });
});
