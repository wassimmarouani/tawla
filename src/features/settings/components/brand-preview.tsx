'use client';

import { brandCssVariables, resolveBrandTheme } from '@/lib/theme/brand';
import { PALETTE } from '@/styles/tokens';

/**
 * Brand colour preview on the customer card surface, light and dark, after the AA adjustment
 * the menu applies (ADR-0027): the owner sees the shades customers will see.
 */
export function BrandPreview({
  color,
  label,
  button,
  badge,
}: {
  color: string;
  label: string;
  button: string;
  badge: string;
}) {
  const ink = PALETTE.light.foreground;
  const paper = PALETTE.light.background;
  const variants = [
    { theme: 'light' as const, surface: PALETTE.light.card },
    { theme: 'dark' as const, surface: PALETTE.dark.card },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map(({ theme, surface }) => {
          const resolved = resolveBrandTheme(color, { surface, ink, paper });
          return (
            <div
              key={theme}
              data-theme={theme}
              style={brandCssVariables(resolved)}
              className="flex flex-col gap-3 rounded-md border border-border bg-card p-4"
            >
              <span className="w-fit rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand-on-subtle">
                {badge}
              </span>
              <span className="flex min-h-target items-center justify-center rounded-xl bg-brand-solid px-4 font-semibold text-brand-on-solid">
                {button}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
