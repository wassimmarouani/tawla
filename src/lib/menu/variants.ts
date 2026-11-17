/**
 * Visual variants for the public menu (spec 02, ADR-0029 amended). Each venue picks one via
 * `restaurants.theme.variant`. A variant overrides CSS custom properties through the
 * `[data-variant="<id>"]` scope in `globals.css`: display font, body font, radius scale, shadow
 * tier, accent pattern. Components stay structurally identical — only tokens change.
 *
 * Fonts come from Google Fonts, loaded on the public menu route (ADR-0002); the "default"
 * variant uses only Inter and skips the font-link so Basic / Pro menus keep the ~150 KB
 * initial budget intact.
 */
export const MENU_VARIANTS = [
  'default',
  'traditional',
  'modern-minimal',
  'bistro',
  'elegant-dark',
  'romantic-pastel',
  'scandinavian',
  'dark-luxe',
  'mediterranean-airy',
  'street-bold',
  'playful-pastel',
] as const;

export type MenuVariant = (typeof MENU_VARIANTS)[number];

export function isMenuVariant(value: unknown): value is MenuVariant {
  return typeof value === 'string' && (MENU_VARIANTS as readonly string[]).includes(value);
}

/** Loader metadata used by the public menu layout to add the right Google Fonts link. */
export interface VariantFontLoad {
  /** Display/heading face. */
  display: { family: string; url: string } | null;
  /** Body face, when the variant needs one different from Inter (already loaded). */
  body: { family: string; url: string } | null;
}

/** Each variant's font package. Only families actually used are declared; others return null. */
export function variantFonts(variant: MenuVariant): VariantFontLoad {
  switch (variant) {
    case 'traditional':
      return {
        display: {
          family: 'Fraunces',
          url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700&display=swap',
        },
        body: {
          family: 'Lora',
          url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',
        },
      };
    case 'bistro':
      return {
        display: {
          family: 'Playfair Display',
          url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap',
        },
        body: null,
      };
    case 'elegant-dark':
      return {
        display: {
          family: 'Cormorant Garamond',
          url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&display=swap',
        },
        body: {
          family: 'Lora',
          url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',
        },
      };
    case 'romantic-pastel':
      return {
        display: {
          family: 'Dancing Script',
          url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap',
        },
        body: {
          family: 'Cormorant Garamond',
          url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&display=swap',
        },
      };
    case 'scandinavian':
      return {
        display: {
          family: 'Space Grotesk',
          url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap',
        },
        body: null,
      };
    case 'dark-luxe':
      return {
        display: {
          family: 'Playfair Display',
          url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap',
        },
        body: null,
      };
    case 'mediterranean-airy':
      return {
        display: {
          family: 'Libre Caslon Text',
          url: 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700&display=swap',
        },
        body: null,
      };
    case 'street-bold':
      return {
        display: {
          family: 'Archivo Black',
          url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap',
        },
        body: null,
      };
    case 'playful-pastel':
      return {
        display: {
          family: 'Fredoka',
          url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap',
        },
        body: null,
      };
    case 'modern-minimal':
      // Inter already loaded by the app; "minimal" relies on scale + spacing.
      return { display: null, body: null };
    case 'default':
    default:
      return { display: null, body: null };
  }
}

/** The subset of variants that call for the color_mode = dark hint by default. */
export function variantPrefersDark(variant: MenuVariant): boolean {
  return variant === 'dark-luxe';
}
