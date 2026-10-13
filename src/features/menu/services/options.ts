import type { LocalizedText, PublicOptionGroup } from '../schemas/public-menu';

export interface EffectiveOption {
  id: string;
  name: LocalizedText;
  /** Price added by this option for this product (override or the option's delta). */
  price: number;
  isAvailable: boolean;
}

export interface EffectiveOptionGroup {
  id: string;
  name: LocalizedText;
  minSelect: number;
  maxSelect: number;
  /** Derived (ADR-0014): at least one choice is mandatory. */
  required: boolean;
  /** Derived: radio-style group. */
  single: boolean;
  options: EffectiveOption[];
}

/**
 * Effective rules of an option group for one product (ADR-0014 §2): product-level min/max and
 * price overrides win over the group's defaults. An inconsistent override pair is repaired so
 * that max ≥ min ≥ 0.
 */
export function effectiveOptionGroup(group: PublicOptionGroup): EffectiveOptionGroup {
  const minSelect = Math.max(0, group.override_min_select ?? group.min_select);
  const maxSelect = Math.max(minSelect, 1, group.override_max_select ?? group.max_select);
  return {
    id: group.id,
    name: group.name,
    minSelect,
    maxSelect,
    required: minSelect > 0,
    single: maxSelect === 1,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      price: group.price_overrides[option.id] ?? option.price_delta,
      isAvailable: option.is_available,
    })),
  };
}
