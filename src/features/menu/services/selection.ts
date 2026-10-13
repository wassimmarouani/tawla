import type { PublicProduct } from '../schemas/public-menu';
import { effectiveOptionGroup, type EffectiveOption } from './options';

export interface ValidSelection {
  /** Chosen options in menu order, with their effective price for this product. */
  options: (EffectiveOption & { groupId: string })[];
}

export type SelectionError =
  | { code: 'product_unavailable' }
  | { code: 'unknown_option'; optionId: string }
  | { code: 'duplicate_option'; optionId: string }
  | { code: 'option_unavailable'; optionId: string; groupId: string }
  | { code: 'too_few'; groupId: string; min: number }
  | { code: 'too_many'; groupId: string; max: number };

export type SelectionResult =
  { ok: true; selection: ValidSelection } | { ok: false; errors: SelectionError[] };

/**
 * Checks a customer's option choices against the product's effective groups (ADR-0014):
 * every id must belong to the product, at most once, be available, and each group's
 * min/max must hold. Returns every problem, so the UI can point at each group.
 */
export function validateSelection(
  product: Pick<PublicProduct, 'is_available' | 'option_groups'>,
  optionIds: readonly string[],
): SelectionResult {
  const errors: SelectionError[] = [];
  if (!product.is_available) errors.push({ code: 'product_unavailable' });

  const groups = product.option_groups.map(effectiveOptionGroup);
  const owner = new Map<string, { groupId: string; option: EffectiveOption }>();
  for (const group of groups) {
    for (const option of group.options) owner.set(option.id, { groupId: group.id, option });
  }

  const seen = new Set<string>();
  for (const optionId of optionIds) {
    if (seen.has(optionId)) errors.push({ code: 'duplicate_option', optionId });
    else if (!owner.has(optionId)) errors.push({ code: 'unknown_option', optionId });
    seen.add(optionId);
  }

  const options: ValidSelection['options'] = [];
  for (const group of groups) {
    const chosen = group.options.filter((option) => seen.has(option.id));
    for (const option of chosen) {
      if (!option.isAvailable) {
        errors.push({ code: 'option_unavailable', optionId: option.id, groupId: group.id });
      }
      options.push({ ...option, groupId: group.id });
    }
    if (chosen.length < group.minSelect) {
      errors.push({ code: 'too_few', groupId: group.id, min: group.minSelect });
    }
    if (chosen.length > group.maxSelect) {
      errors.push({ code: 'too_many', groupId: group.id, max: group.maxSelect });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, selection: { options } };
}
