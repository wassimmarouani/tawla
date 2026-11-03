/** Message key of a selection rule, as shown on group cards and product links. */
export type RuleKey =
  'requiredSingle' | 'optionalSingle' | 'requiredExact' | 'requiredRange' | 'optionalMulti';

export interface RuleSummary {
  key: RuleKey;
  values: { count?: number; min?: number; max?: number };
}

/**
 * Plain-language rule of a group (ADR-0014: required = min > 0, single = max 1):
 * "Required · 1 choice", "Optional · up to 3 choices", "Required · 1 to 2 choices"…
 */
export function ruleSummary(minSelect: number, maxSelect: number): RuleSummary {
  if (minSelect === 0) {
    return maxSelect === 1
      ? { key: 'optionalSingle', values: {} }
      : { key: 'optionalMulti', values: { max: maxSelect } };
  }
  if (maxSelect === 1) return { key: 'requiredSingle', values: {} };
  if (minSelect === maxSelect) return { key: 'requiredExact', values: { count: minSelect } };
  return { key: 'requiredRange', values: { min: minSelect, max: maxSelect } };
}

/** Rules a product applies: its overrides, else the group's defaults (ADR-0014 §2). */
export function effectiveRules(
  group: { minSelect: number; maxSelect: number },
  link: { minSelect: number | null; maxSelect: number | null },
): { minSelect: number; maxSelect: number } {
  return {
    minSelect: link.minSelect ?? group.minSelect,
    maxSelect: link.maxSelect ?? group.maxSelect,
  };
}
