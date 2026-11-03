import { z } from 'zod';
import { ROUNDING_STEPS, parseMoneyInput } from '@/lib/money';
import { scheduleSchema } from '@/lib/schedule';
import { ALLERGENS, BADGES, DIETARY } from '@/lib/menu/attributes';
import { i18nTextSchema } from './i18n-text';
import { optionLinkFormSchema, optionLinkInputSchema, optionLinksSchema } from './options';

/** Database ceiling for a product price: 10 000 DT in millimes (catches typos). */
export const MAX_PRODUCT_PRICE = 10_000_000;
/** Upper bound of ids in one bulk or reorder request. */
export const MAX_BATCH = 500;

const idSchema = z.uuid();

const idListSchema = z
  .array(idSchema)
  .min(1)
  .max(MAX_BATCH)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'duplicate' });

function uniqueList<T extends z.ZodType<string>>(item: T) {
  return z
    .array(item)
    .max(20)
    .refine((values) => new Set(values).size === values.length, { message: 'duplicate' });
}

export const categoryInputSchema = z.object({
  name: i18nTextSchema(80, true),
  isVisible: z.boolean(),
  /** Time window (ADR-0014); `null` = served all day. */
  availability: scheduleSchema.nullable(),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const priceSchema = z.int().min(0).max(MAX_PRODUCT_PRICE);

export const productInputSchema = z.object({
  categoryId: idSchema,
  name: i18nTextSchema(120, true),
  description: i18nTextSchema(500, false),
  /** Integer millimes (CLAUDE.md rule 1). */
  price: priceSchema,
  mediaId: idSchema.nullable(),
  isAvailable: z.boolean(),
  isVisible: z.boolean(),
  badges: uniqueList(z.enum(BADGES)),
  allergens: uniqueList(z.enum(ALLERGENS)),
  dietary: uniqueList(z.enum(DIETARY)),
  /** Option groups in display order, with product-level overrides (ADR-0014 §2). */
  optionLinks: optionLinksSchema(optionLinkInputSchema),
});
export type ProductInput = z.input<typeof productInputSchema>;

/** The price as typed (`3,5`, `3.500`, `٣٫٥`) → millimes; `priceInvalid` otherwise. */
export const priceTextSchema = z.string().transform((value, context) => {
  const millimes = parseMoneyInput(value);
  if (value.trim() === '') {
    context.addIssue({ code: 'custom', message: 'required' });
    return z.NEVER;
  }
  if (millimes === null || millimes > MAX_PRODUCT_PRICE) {
    context.addIssue({ code: 'custom', message: 'priceInvalid' });
    return z.NEVER;
  }
  return millimes;
});

/** Product form values: same as the input, with the price as typed. */
export const productFormSchema = productInputSchema.extend({
  price: priceTextSchema,
  optionLinks: optionLinksSchema(optionLinkFormSchema),
});
export type ProductForm = z.input<typeof productFormSchema>;

export const idsSchema = z.object({ ids: idListSchema });

export const reorderProductsSchema = z.object({ categoryId: idSchema, ids: idListSchema });

export const availabilitySchema = z.object({ id: idSchema, available: z.boolean() });

export const visibilitySchema = z.object({ ids: idListSchema, visible: z.boolean() });

export const bulkPriceSchema = z.object({
  ids: idListSchema,
  /** Change in basis points: +1 000 = +10 %, −2 500 = −25 %. */
  basisPoints: z
    .int()
    .min(-9_000)
    .max(20_000)
    .refine((value) => value !== 0, { message: 'required' }),
  step: z.literal(ROUNDING_STEPS),
});

export const setPricesSchema = z.object({
  prices: z
    .array(z.object({ id: idSchema, price: priceSchema }))
    .min(1)
    .max(MAX_BATCH),
});

export const uploadKindSchema = z.enum(['product', 'category']);

export const processUploadSchema = z.object({
  path: z.string().max(200),
  kind: uploadKindSchema,
});
