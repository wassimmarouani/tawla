import { z } from 'zod';

const localizedNameSchema = z.object({
  fr: z.string().min(1),
  ar: z.string().min(1),
  en: z.string().min(1),
});

/** `null` = unlimited (Premium). */
const limitSchema = z.number().int().positive().nullable();

/** A row of the public plan catalogue (`plans`, ADR-0015), jsonb columns validated (rule 3). */
export const publicPlanSchema = z.object({
  code: z.string().regex(/^[a-z_]{2,32}$/),
  name: localizedNameSchema,
  priceMonthly: z.number().int().nonnegative(),
  priceYearly: z.number().int().nonnegative(),
  /** One-time purchase, no subscription (Menu QR, ADR-0031). */
  priceOnce: z.number().int().nonnegative().nullable(),
  features: z.array(z.string().min(1)),
  limits: z.object({ tables: limitSchema, staff: limitSchema, products: limitSchema }),
  aiLimits: z.object({
    photo_imports: z.number().int().nonnegative(),
    translated_items: z.number().int().nonnegative(),
  }),
});

export type PublicPlan = z.infer<typeof publicPlanSchema>;
