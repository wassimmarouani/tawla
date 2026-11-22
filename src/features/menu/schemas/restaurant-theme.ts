import { z } from 'zod';
import { MENU_VARIANTS } from '@/lib/menu/variants';
import { MENU_TEMPLATE_IDS } from '../templates/ids';

/** `restaurants.theme` (jsonb, validated on read: CLAUDE.md rule 3). Invalid data reads as `{}`. */
export const restaurantThemeSchema = z
  .object({
    brand_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    /** Light / dark / auto (system) for the customer menu (spec 02, P1-14). */
    color_mode: z.enum(['auto', 'light', 'dark']).optional().catch(undefined),
    /** Visual variant of the public menu (fonts, radius, accents). Unknown values fall to default. */
    variant: z.enum(MENU_VARIANTS).optional().catch(undefined),
    /**
     * Presentation template (distinct layout, e.g. the Vesuvio printed carte). Orthogonal to
     * `variant`; unknown/absent falls back to the default layout. See `templates/ids.ts`.
     */
    template: z.enum(MENU_TEMPLATE_IDS).optional().catch(undefined),
  })
  .catch({});

export type RestaurantTheme = z.infer<typeof restaurantThemeSchema>;
