import { z } from 'zod';
import { brandCssVariables, resolveBrandTheme, type BrandTheme } from '@/lib/theme/brand';
import { PALETTE } from '@/styles/tokens';

/** `restaurants.theme` (jsonb, validated on read: CLAUDE.md rule 3). */
export const restaurantThemeSchema = z
  .object({
    brand_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
  })
  .catch({});

function declarations(theme: BrandTheme): string {
  return Object.entries(brandCssVariables(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}

/**
 * Tenant brand colours (ADR-0027) for light and dark surfaces, scoped to `[data-tenant]`.
 * Values come from the AA-checked resolver, never from raw input; the scope is a base64url id.
 */
export function BrandStyle({ theme, scope }: { theme: unknown; scope: string }) {
  const { brand_color: color } = restaurantThemeSchema.parse(theme);
  if (!color || !/^[\w-]+$/.test(scope)) return null;

  const ink = PALETTE.light.foreground;
  const paper = PALETTE.light.background;
  const light = resolveBrandTheme(color, { surface: PALETTE.light.card, ink, paper });
  const dark = resolveBrandTheme(color, { surface: PALETTE.dark.card, ink, paper });
  const selector = `[data-tenant="${scope}"]`;
  const css = [
    `${selector}{${declarations(light)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) ${selector}{${declarations(dark)}}}`,
    `:root[data-theme="dark"] ${selector}{${declarations(dark)}}`,
  ].join('');
  return <style>{css}</style>;
}
