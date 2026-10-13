import type { PublicOptionGroup, PublicProduct } from '../schemas/public-menu';

/** Deterministic uuid-shaped ids for fixtures: id(1) → 00000000-0000-4000-8000-000000000001. */
export function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function text(value: string, lang: 'fr' | 'ar' | 'en' = 'fr') {
  return { text: value, lang };
}

export function group(
  n: number,
  options: { price?: number; available?: boolean }[],
  rules: Partial<
    Pick<
      PublicOptionGroup,
      | 'min_select'
      | 'max_select'
      | 'override_min_select'
      | 'override_max_select'
      | 'price_overrides'
    >
  > = {},
): PublicOptionGroup {
  return {
    id: id(1000 + n),
    name: text(`Groupe ${String(n)}`),
    min_select: rules.min_select ?? 0,
    max_select: rules.max_select ?? 1,
    override_min_select: rules.override_min_select ?? null,
    override_max_select: rules.override_max_select ?? null,
    price_overrides: rules.price_overrides ?? {},
    options: options.map((option, index) => ({
      id: id(1000 + n * 10 + index + 1),
      name: text(`Option ${String(n)}.${String(index + 1)}`),
      price_delta: option.price ?? 0,
      is_available: option.available ?? true,
      version: 1,
    })),
  };
}

export function product(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: id(1),
    slug: 'capucin',
    name: text('Capucin'),
    description: null,
    price: 2200,
    media: null,
    badges: [],
    allergens: [],
    dietary: [],
    is_available: true,
    version: 1,
    search: 'Capucin كابوسان Capucin Cafés القهوة Coffee',
    option_groups: [],
    ...overrides,
  };
}
