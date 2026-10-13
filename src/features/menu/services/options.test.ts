import { describe, expect, it } from 'vitest';
import { group, id } from '../testing/fixtures';
import { effectiveOptionGroup } from './options';

describe('effectiveOptionGroup', () => {
  it('uses the group defaults without overrides', () => {
    const result = effectiveOptionGroup(
      group(1, [{ price: 0 }, { price: 1000 }], { min_select: 1, max_select: 1 }),
    );
    expect(result).toMatchObject({ minSelect: 1, maxSelect: 1, required: true, single: true });
    expect(result.options.map((option) => option.price)).toEqual([0, 1000]);
  });

  it('applies product-level min/max and price overrides', () => {
    const result = effectiveOptionGroup(
      group(2, [{ price: 0 }, { price: 1000 }], {
        min_select: 1,
        max_select: 3,
        override_min_select: 2,
        override_max_select: 2,
        price_overrides: { [id(1022)]: 2500 },
      }),
    );
    expect(result).toMatchObject({ minSelect: 2, maxSelect: 2, required: true, single: false });
    expect(result.options.map((option) => option.price)).toEqual([0, 2500]);
  });

  it('derives optional multi-choice groups', () => {
    expect(effectiveOptionGroup(group(3, [{}], { min_select: 0, max_select: 3 }))).toMatchObject({
      required: false,
      single: false,
    });
  });

  it('repairs an inconsistent override pair so max ≥ min', () => {
    const result = effectiveOptionGroup(
      group(4, [{}], { min_select: 0, max_select: 1, override_min_select: 3 }),
    );
    expect(result).toMatchObject({ minSelect: 3, maxSelect: 3 });
  });

  it('keeps availability per option', () => {
    const result = effectiveOptionGroup(group(5, [{ available: false }, {}]));
    expect(result.options.map((option) => option.isAvailable)).toEqual([false, true]);
  });
});
