import { z } from 'zod';
import { ALLERGENS, BADGES, DIETARY } from '@/lib/menu/attributes';
import { LOCALES } from '@/i18n/locales';
import { scheduleSchema } from '@/lib/schedule';

/**
 * Output of `get_public_menu(slug, locale)` (P1-01), validated at the boundary
 * (CLAUDE.md rule 3). Text fields are already resolved for the locale: `{ text, lang }`.
 */
export const localizedTextSchema = z.object({ text: z.string(), lang: z.enum(LOCALES) });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const millimesSchema = z.number().int().min(0);

export const publicMediaSchema = z.object({
  base_path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumbhash: z.string().nullable(),
  dominant_color: z.string().nullable(),
  renditions: z.object({
    widths: z.array(z.number().int().positive()).min(1),
    formats: z.array(z.enum(['avif', 'webp', 'png'])).min(1),
  }),
});

export type PublicMedia = z.infer<typeof publicMediaSchema>;

export const publicOptionSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  price_delta: millimesSchema,
  is_available: z.boolean(),
  version: z.number().int(),
});
export type PublicOption = z.infer<typeof publicOptionSchema>;

export const publicOptionGroupSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  min_select: z.number().int().min(0),
  max_select: z.number().int().min(1),
  override_min_select: z.number().int().min(0).nullable(),
  override_max_select: z.number().int().min(1).nullable(),
  price_overrides: z.record(z.uuid(), millimesSchema),
  options: z.array(publicOptionSchema),
});
export type PublicOptionGroup = z.infer<typeof publicOptionGroupSchema>;

export const publicProductSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  price: millimesSchema,
  media: publicMediaSchema.nullable(),
  badges: z.array(z.enum(BADGES)),
  allergens: z.array(z.enum(ALLERGENS)),
  dietary: z.array(z.enum(DIETARY)),
  is_available: z.boolean(),
  version: z.number().int(),
  search: z.string(),
  option_groups: z.array(publicOptionGroupSchema),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;

export const publicCategorySchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  icon: z.string().nullable(),
  media: publicMediaSchema.nullable(),
  availability: scheduleSchema.nullable(),
  products: z.array(publicProductSchema),
});
export type PublicCategory = z.infer<typeof publicCategorySchema>;

export const publicMenuSchema = z.object({
  restaurant: z.object({
    public_id: z.string(),
    slug: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.enum(['active', 'read_only']),
    locale: z.enum(LOCALES),
    default_locale: z.enum(LOCALES),
    locales: z.array(z.enum(LOCALES)),
    timezone: z.string(),
    currency: z.literal('TND'),
    opening_schedule: scheduleSchema,
    manual_status: z.enum(['auto', 'open', 'closed']),
    manual_status_until: z.string().nullable(),
    theme: z.record(z.string(), z.unknown()),
    logo: publicMediaSchema.nullable(),
    cover: publicMediaSchema.nullable(),
  }),
  categories: z.array(publicCategorySchema),
});
export type PublicMenu = z.infer<typeof publicMenuSchema>;
