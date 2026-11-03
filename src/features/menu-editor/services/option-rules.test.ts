import { describe, expect, it } from 'vitest';
import { effectiveRules, ruleSummary } from './option-rules';

describe('ruleSummary', () => {
  it.each([
    [0, 1, { key: 'optionalSingle', values: {} }],
    [0, 3, { key: 'optionalMulti', values: { max: 3 } }],
    [1, 1, { key: 'requiredSingle', values: {} }],
    [2, 2, { key: 'requiredExact', values: { count: 2 } }],
    [1, 3, { key: 'requiredRange', values: { min: 1, max: 3 } }],
  ] as const)('min %i max %i', (min, max, expected) => {
    expect(ruleSummary(min, max)).toEqual(expected);
  });
});

describe('effectiveRules', () => {
  it('prefers product overrides', () => {
    const group = { minSelect: 0, maxSelect: 1 };
    expect(effectiveRules(group, { minSelect: null, maxSelect: null })).toEqual(group);
    expect(effectiveRules(group, { minSelect: 1, maxSelect: null })).toEqual({
      minSelect: 1,
      maxSelect: 1,
    });
    expect(effectiveRules(group, { minSelect: null, maxSelect: 4 })).toEqual({
      minSelect: 0,
      maxSelect: 4,
    });
  });
});
