import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money';
import { i18nTextSchema } from './i18n-text';

/** Product prices and option deltas share the 10 000 DT ceiling of the database. */
const MAX_PRICE = 10_000_000;
/** `option_groups.min_select between 0 and 20`, `max_select between 1 and 20`. */
export const MAX_SELECT = 20;
export const MAX_OPTIONS_PER_GROUP = 30;
export const MAX_GROUPS_PER_PRODUCT = 10;

const priceSchema = z.int().min(0).max(MAX_PRICE);

/** Option price as typed; blank means free (+0). */
const optionPriceTextSchema = z.string().transform((value, context) => {
  if (value.trim() === '') return 0;
  const millimes = parseMoneyInput(value);
  if (millimes === null || millimes > MAX_PRICE) {
    context.addIssue({ code: 'custom', message: 'priceInvalid' });
    return z.NEVER;
  }
  return millimes;
});

/** A product-level price override as typed; blank keeps the option's own price. */
const overridePriceTextSchema = z.string().transform((value, context) => {
  if (value.trim() === '') return null;
  const millimes = parseMoneyInput(value);
  if (millimes === null || millimes > MAX_PRICE) {
    context.addIssue({ code: 'custom', message: 'priceInvalid' });
    return z.NEVER;
  }
  return millimes;
});

/** A selection count as typed (`0`–`20`); blank is `null` where allowed. */
function countTextSchema(min: number, optional: boolean) {
  return z.string().transform((value, context) => {
    const text = value.trim();
    if (text === '' && optional) return null;
    const count = /^\d{1,2}$/.test(text) ? Number(text) : Number.NaN;
    if (!(count >= min && count <= MAX_SELECT)) {
      context.addIssue({ code: 'custom', message: 'countInvalid' });
      return z.NEVER;
    }
    return count;
  });
}

interface Rules {
  minSelect: number;
  maxSelect: number;
  options: readonly unknown[];
}

/** ADR-0014: max ≥ min, and a required choice needs enough options to pick from. */
function withRules<T extends z.ZodType<Rules>>(schema: T) {
  return schema
    .refine((group) => group.maxSelect >= group.minSelect, {
      message: 'minAboveMax',
      path: ['maxSelect'],
    })
    .refine((group) => group.minSelect <= group.options.length, {
      message: 'minAboveOptions',
      path: ['minSelect'],
    });
}

export const optionInputSchema = z.object({
  /** `null` for a new option. */
  id: z.uuid().nullable(),
  name: i18nTextSchema(80, true),
  priceDelta: priceSchema,
  isAvailable: z.boolean(),
});

export const optionGroupInputSchema = withRules(
  z.object({
    name: i18nTextSchema(80, true),
    minSelect: z.int().min(0).max(MAX_SELECT),
    maxSelect: z.int().min(1).max(MAX_SELECT),
    options: z.array(optionInputSchema).min(1, 'noOptions').max(MAX_OPTIONS_PER_GROUP),
  }),
);
export type OptionGroupInput = z.input<typeof optionGroupInputSchema>;

/** Option group dialog values: counts and prices as typed. */
export const optionGroupFormSchema = withRules(
  z.object({
    name: i18nTextSchema(80, true),
    minSelect: countTextSchema(0, false).pipe(z.int()),
    maxSelect: countTextSchema(1, false).pipe(z.int()),
    options: z
      .array(
        z.object({
          id: z.uuid().nullable(),
          name: i18nTextSchema(80, true),
          priceDelta: optionPriceTextSchema,
          isAvailable: z.boolean(),
        }),
      )
      .min(1, 'noOptions')
      .max(MAX_OPTIONS_PER_GROUP),
  }),
);
export type OptionGroupForm = z.input<typeof optionGroupFormSchema>;

const overridesRefinement = {
  check: (link: { minSelect: number | null; maxSelect: number | null }) =>
    link.minSelect === null || link.maxSelect === null || link.maxSelect >= link.minSelect,
  params: { message: 'minAboveMax', path: ['maxSelect'] },
};

/** A product's use of a group, with optional overrides (ADR-0014 §2). */
export const optionLinkInputSchema = z
  .object({
    optionGroupId: z.uuid(),
    minSelect: z.int().min(0).max(MAX_SELECT).nullable(),
    maxSelect: z.int().min(1).max(MAX_SELECT).nullable(),
    priceOverrides: z.record(z.uuid(), priceSchema),
  })
  .refine(overridesRefinement.check, overridesRefinement.params);
export type OptionLinkInput = z.input<typeof optionLinkInputSchema>;

export const optionLinkFormSchema = z
  .object({
    optionGroupId: z.uuid(),
    minSelect: countTextSchema(0, true),
    maxSelect: countTextSchema(1, true),
    /** Option id → price as typed; blank entries are dropped. */
    priceOverrides: z.record(z.uuid(), overridePriceTextSchema).transform((overrides) => {
      const kept: Record<string, number> = {};
      for (const [optionId, price] of Object.entries(overrides)) {
        if (price !== null) kept[optionId] = price;
      }
      return kept;
    }),
  })
  .refine(overridesRefinement.check, overridesRefinement.params);
export type OptionLinkForm = z.input<typeof optionLinkFormSchema>;

/** Links in display order, each group at most once. */
export function optionLinksSchema<T extends z.ZodType<{ optionGroupId: string }>>(link: T) {
  return z
    .array(link)
    .max(MAX_GROUPS_PER_PRODUCT)
    .refine((links) => new Set(links.map((entry) => entry.optionGroupId)).size === links.length, {
      message: 'duplicate',
    });
}
