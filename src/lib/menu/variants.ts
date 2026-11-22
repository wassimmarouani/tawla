/**
 * Visual presets for the public menu (spec 02 §6.4 / 7, ADR-0029 amended). The redesign
 * consolidates the earlier ten ad-hoc variants into the spec's seven named "Méditerranée moderne"
 * presets; the ten demo venues still exist, several sharing a preset (see `demo-variants.ts`).
 *
 * Each preset picks one identity via `restaurants.theme.variant` and overrides CSS custom
 * properties through the `[data-variant="<id>"]` scope in `globals.css`: palette (surface + text
 * tokens), display font, body font, radius scale and section decoration. Components stay
 * structurally identical — only tokens change.
 *
 * Fonts come from Google Fonts, loaded on the public menu route (ADR-0002); the "default"
 * preset uses only the already-loaded Geist / IBM Plex Sans Arabic faces and skips the font-link
 * so Basic / Pro menus keep the ~150 KB initial budget intact. Fraunces is shared by every serif
 * preset (one request), so adding presets does not add font downloads.
 */
export const MENU_VARIANTS = [
  'default',
  'medina',
  'specialty',
  'trattoria',
  'atelier',
  'nocturne',
  'street',
  'gelato',
] as const;

export type MenuVariant = (typeof MENU_VARIANTS)[number];

export function isMenuVariant(value: unknown): value is MenuVariant {
  return typeof value === 'string' && (MENU_VARIANTS as readonly string[]).includes(value);
}

/** Loader metadata used by the public menu layout to add the right Google Fonts link. */
export interface VariantFontLoad {
  /** Display/heading face. */
  display: { family: string; url: string } | null;
  /** Body face, when the preset needs one different from the already-loaded sans. */
  body: { family: string; url: string } | null;
}

/**
 * Fraunces — the shared editorial serif used for display titles in Médina, Trattoria, Atelier and
 * Nocturne. One request with the italic + optical-size axes covers all four presets.
 */
const FRAUNCES = {
  family: 'Fraunces',
  url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&display=swap',
} as const;

/** Each preset's font package. Only families actually used are declared; others return null. */
export function variantFonts(variant: MenuVariant): VariantFontLoad {
  switch (variant) {
    case 'trattoria':
      // Trattoria resolves to the Vesuvio template (printed-carte editorial). Classic serif:
      // Cormorant for Latin display, Amiri for Arabic — the `--font-title` stack lists both so the
      // browser picks Amiri for Arabic glyphs. Both faces are loaded here (display + body slots).
      return {
        display: {
          family: 'Cormorant',
          url: 'https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap',
        },
        body: {
          family: 'Amiri',
          url: 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap',
        },
      };
    case 'medina':
    case 'atelier':
    case 'nocturne':
      // Shared serif display face; body stays on the already-loaded sans / Arabic stack.
      return { display: FRAUNCES, body: null };
    case 'street':
      return {
        display: {
          family: 'Archivo Black',
          url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap',
        },
        body: null,
      };
    case 'gelato':
      return {
        display: {
          family: 'Fredoka',
          url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap',
        },
        body: null,
      };
    case 'specialty':
      // Clean specialty-coffee identity relies on the already-loaded Geist and on scale + spacing.
      return { display: null, body: null };
    case 'default':
    default:
      return { display: null, body: null };
  }
}

/** The subset of presets that default to the dark (Night) surface palette. */
export function variantPrefersDark(variant: MenuVariant): boolean {
  return variant === 'nocturne';
}
