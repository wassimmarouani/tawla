import { clampChroma, converter, formatHex, parse, wcagContrast, type Oklch } from 'culori';

/**
 * Tenant brand theming (ADR-0027): any restaurant colour becomes an OKLCH 50–950 scale, and the
 * shades actually used are picked so WCAG AA always holds, whatever colour the owner chose.
 */

export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type BrandStep = (typeof BRAND_STEPS)[number];
export type BrandScale = Record<BrandStep, string>;

/** Target OKLCH lightness per step, close to Tailwind's perceptual ramp. */
const LIGHTNESS: Record<BrandStep, number> = {
  50: 0.975,
  100: 0.945,
  200: 0.885,
  300: 0.81,
  400: 0.72,
  500: 0.635,
  600: 0.555,
  700: 0.475,
  800: 0.395,
  900: 0.315,
  950: 0.235,
};

/** Chroma relative to the source colour: muted at the ends, full in the middle. */
const CHROMA_FACTOR: Record<BrandStep, number> = {
  50: 0.18,
  100: 0.32,
  200: 0.55,
  300: 0.78,
  400: 0.95,
  500: 1,
  600: 1,
  700: 0.95,
  800: 0.85,
  900: 0.72,
  950: 0.6,
};

/** WCAG 2.2 thresholds. */
export const TEXT_CONTRAST = 4.5;
export const UI_CONTRAST = 3;

const toOklch = converter('oklch');

export function parseBrandColor(input: string): Oklch {
  const parsed = parse(input.trim());
  const color = parsed ? toOklch(parsed) : undefined;
  if (!color) throw new RangeError(`Invalid brand colour: ${input}`);
  return color;
}

/** OKLCH scale from a single colour, gamut-mapped to sRGB, returned as hex strings. */
export function generateBrandScale(input: string): BrandScale {
  const base = parseBrandColor(input);
  const hue = base.h ?? 0;
  const chroma = base.c;
  const scale = {} as BrandScale;
  for (const step of BRAND_STEPS) {
    const shade = clampChroma(
      { mode: 'oklch', l: LIGHTNESS[step], c: chroma * CHROMA_FACTOR[step], h: hue },
      'oklch',
    );
    scale[step] = formatHex(shade);
  }
  return scale;
}

export interface BrandSurface {
  /** Page / card background the brand colour sits on. */
  surface: string;
  /** Darkest text colour of the design system (for text on light solids). */
  ink: string;
  /** Lightest text colour of the design system (for text on dark solids). */
  paper: string;
}

export interface BrandTheme {
  scale: BrandScale;
  /** Filled buttons and badges: the owner's colour whenever a readable label fits on it. */
  solid: string;
  /** Text and icons on `solid` (ink or paper). */
  onSolid: string;
  /** Non-text indicators on the surface (active tab line, borders): ≥ 3:1 (WCAG 1.4.11). */
  accent: string;
  /** Brand-coloured text and links on the surface. */
  text: string;
  /** Tinted backgrounds (selected chips, highlights). */
  subtle: string;
  /** Text on `subtle`. */
  onSubtle: string;
}

export function contrast(a: string, b: string): number {
  return wcagContrast(a, b);
}

/** Steps ordered by distance from the source colour's lightness (closest first). */
function stepsByCloseness(sourceLightness: number): BrandStep[] {
  return [...BRAND_STEPS].sort(
    (a, b) => Math.abs(LIGHTNESS[a] - sourceLightness) - Math.abs(LIGHTNESS[b] - sourceLightness),
  );
}

function firstMatching(
  steps: readonly BrandStep[],
  scale: BrandScale,
  predicate: (hex: string) => boolean,
): string {
  for (const step of steps) {
    const hex = scale[step];
    if (predicate(hex)) return hex;
  }
  // Unreachable for real surfaces: the 50 and 950 extremes always satisfy the predicates.
  throw new RangeError('No accessible brand shade for this surface');
}

/**
 * Picks the shades of the brand scale to use on `surface`, staying as close as possible to the
 * owner's colour while guaranteeing AA: brand text ≥ 4.5:1 and indicators ≥ 3:1 against the
 * surface, labels on solid fills ≥ 4.5:1. A filled button is identified by its label, so its fill
 * keeps the owner's exact colour when possible (WCAG 1.4.11 does not apply to the fill itself).
 */
export function resolveBrandTheme(
  input: string,
  { surface, ink, paper }: BrandSurface,
): BrandTheme {
  const source = parseBrandColor(input);
  const scale = generateBrandScale(input);
  const order = stepsByCloseness(source.l);
  const surfaceIsDark = contrast(surface, paper) > contrast(surface, ink);

  const bestOn = (background: string) =>
    contrast(background, ink) >= contrast(background, paper) ? ink : paper;

  const solid = firstMatching(order, scale, (hex) => contrast(hex, bestOn(hex)) >= TEXT_CONTRAST);
  const accent = firstMatching(order, scale, (hex) => contrast(hex, surface) >= UI_CONTRAST);
  const text = firstMatching(order, scale, (hex) => contrast(hex, surface) >= TEXT_CONTRAST);
  const subtleSteps: readonly BrandStep[] = surfaceIsDark ? [900, 950, 800] : [50, 100, 200];
  const subtle = firstMatching(subtleSteps, scale, () => true);
  const onSubtle = firstMatching(
    surfaceIsDark ? [200, 100, 50] : [800, 900, 950],
    scale,
    (hex) => contrast(hex, subtle) >= TEXT_CONTRAST,
  );

  return { scale, solid, onSolid: bestOn(solid), accent, text, subtle, onSubtle };
}

/** CSS custom properties for a resolved theme (injected on the menu root element). */
export function brandCssVariables(theme: BrandTheme): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const step of BRAND_STEPS) variables[`--brand-${String(step)}`] = theme.scale[step];
  variables['--brand-solid'] = theme.solid;
  variables['--brand-on-solid'] = theme.onSolid;
  variables['--brand-accent'] = theme.accent;
  variables['--brand-text'] = theme.text;
  variables['--brand-subtle'] = theme.subtle;
  variables['--brand-on-subtle'] = theme.onSubtle;
  return variables;
}
