import { brandCssVariables, resolveBrandTheme, type BrandTheme } from '@/lib/theme/brand';
import { PALETTE } from '@/styles/tokens';
import { restaurantThemeSchema } from '../schemas/restaurant-theme';

function declarations(theme: BrandTheme): string {
  return Object.entries(brandCssVariables(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}

/**
 * Tenant brand colours (ADR-0027) for light and dark surfaces, scoped to `[data-tenant]`.
 * Values come from the AA-checked resolver, never from raw input; the scope is a base64url id.
 */
export function BrandStyle({
  theme,
  scope,
  forceMode,
}: {
  theme: unknown;
  scope: string;
  /** Overrides the theme's own `color_mode` (e.g. a Night preset pinned dark). */
  forceMode?: 'auto' | 'light' | 'dark';
}) {
  const parsed = restaurantThemeSchema.parse(theme);
  const color = parsed.brand_color;
  const mode = forceMode ?? parsed.color_mode;
  if (!color || !/^[\w-]+$/.test(scope)) return null;

  const ink = PALETTE.light.foreground;
  const paper = PALETTE.light.background;
  const light = resolveBrandTheme(color, { surface: PALETTE.light.card, ink, paper });
  const dark = resolveBrandTheme(color, { surface: PALETTE.dark.card, ink, paper });
  const selector = `[data-tenant="${scope}"]`;
  // A forced mode (Settings) pins the menu's surfaces, so only that variant applies.
  if (mode === 'light' || mode === 'dark') {
    return <style>{`${selector}{${declarations(mode === 'light' ? light : dark)}}`}</style>;
  }
  const css = [
    `${selector}{${declarations(light)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) ${selector}{${declarations(dark)}}}`,
    `:root[data-theme="dark"] ${selector}{${declarations(dark)}}`,
  ].join('');
  return <style>{css}</style>;
}
