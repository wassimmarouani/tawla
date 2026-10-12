import { brandCssVariables, resolveBrandTheme } from '@/lib/theme/brand';

export const DIRECTION_IDS = ['a', 'b', 'c'] as const;
export type DirectionId = (typeof DIRECTION_IDS)[number];
export type ThemeMode = 'light' | 'dark';

interface Palette {
  paper: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
}

export interface Direction {
  id: DirectionId;
  name: string;
  fonts: { latin: 'geist' | 'inter'; arabic: 'plex' | 'cairo' };
  palettes: Record<ThemeMode, Palette>;
}

/** Three distinct platform directions for P0-06 (ADR-0027). */
export const DIRECTIONS: Record<DirectionId, Direction> = {
  a: {
    id: 'a',
    name: 'Jasmin — calm Mediterranean editorial',
    fonts: { latin: 'geist', arabic: 'plex' },
    palettes: {
      light: {
        paper: '#fbfaf7',
        surface: '#ffffff',
        surface2: '#f3f1ec',
        ink: '#1c1b17',
        muted: '#615d55',
        line: '#e9e5dc',
      },
      dark: {
        paper: '#111110',
        surface: '#1a1a18',
        surface2: '#252522',
        ink: '#f3f1ec',
        muted: '#aaa59a',
        line: '#2e2d29',
      },
    },
  },
  b: {
    id: 'b',
    name: 'Médina — bold menu-card editorial',
    fonts: { latin: 'inter', arabic: 'cairo' },
    palettes: {
      light: {
        paper: '#f2eee5',
        surface: '#f2eee5',
        surface2: '#e7e1d4',
        ink: '#14130f',
        muted: '#57524a',
        line: '#cfc7b6',
      },
      dark: {
        paper: '#0c0c0a',
        surface: '#0c0c0a',
        surface2: '#1a1915',
        ink: '#f2eee5',
        muted: '#a29c90',
        line: '#34322b',
      },
    },
  },
  c: {
    id: 'c',
    name: 'Souk — warm, tactile, friendly',
    fonts: { latin: 'geist', arabic: 'cairo' },
    palettes: {
      light: {
        paper: '#f4ede1',
        surface: '#fffdf9',
        surface2: '#ebe2d2',
        ink: '#2b2118',
        muted: '#6a5d50',
        line: '#e2d7c5',
      },
      dark: {
        paper: '#16120e',
        surface: '#221c16',
        surface2: '#2d261e',
        ink: '#f4ede1',
        muted: '#b0a392',
        line: '#3a3128',
      },
    },
  },
};

/** Two tenant colours that stress the brand engine: one pale, one very dark. */
export const DEMO_BRANDS = { saffron: '#e8a317', olive: '#3f5a2b' } as const;
export type DemoBrand = keyof typeof DEMO_BRANDS;

export interface Variant {
  slug: string;
  theme: ThemeMode;
  photos: boolean;
  brand: DemoBrand;
}

export const VARIANTS: readonly Variant[] = (['light', 'dark'] as const).flatMap((theme) =>
  [true, false].flatMap((photos) =>
    (Object.keys(DEMO_BRANDS) as DemoBrand[]).map((brand) => ({
      slug: `${theme}-${photos ? 'photos' : 'nophotos'}-${brand}`,
      theme,
      photos,
      brand,
    })),
  ),
);

export function findVariant(slug: string): Variant | undefined {
  return VARIANTS.find((variant) => variant.slug === slug);
}

export function isDirectionId(value: string): value is DirectionId {
  return (DIRECTION_IDS as readonly string[]).includes(value);
}

/**
 * CSS custom properties for a direction × variant: palette + AA-safe brand shades. Brand shades
 * are resolved against `surface2`, the background closest to the text colour in both modes
 * (darkest in light mode, lightest in dark mode), so they also pass on `paper` and `surface`.
 */
export function themeVariables(direction: Direction, variant: Variant): Record<string, string> {
  const palette = direction.palettes[variant.theme];
  const brand = resolveBrandTheme(DEMO_BRANDS[variant.brand], {
    surface: palette.surface2,
    ink: direction.palettes.light.ink,
    paper: direction.palettes.light.paper,
  });
  return {
    '--paper': palette.paper,
    '--surface': palette.surface,
    '--surface-2': palette.surface2,
    '--ink': palette.ink,
    '--muted': palette.muted,
    '--line': palette.line,
    ...brandCssVariables(brand),
  };
}
