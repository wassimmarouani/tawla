import { z } from 'zod';

/** `restaurants.theme` (jsonb, validated on read: CLAUDE.md rule 3). Invalid data reads as `{}`. */
export const restaurantThemeSchema = z
  .object({
    brand_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    /** Light / dark / auto (system) for the customer menu (spec 02, P1-14). */
    color_mode: z.enum(['auto', 'light', 'dark']).optional().catch(undefined),
  })
  .catch({});

export type RestaurantTheme = z.infer<typeof restaurantThemeSchema>;
