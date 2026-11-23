import type { MenuTemplateId } from './ids';

/**
 * Per-template Google Fonts (brief §6.2). A named template often needs a type pairing its recolor
 * `variant` does not provide — two templates share one variant (Vesuvio + Mediterranea both recolor
 * `trattoria`) but the MATRIX gives each its own fonts. `variantFonts` only has two slots, so the
 * template's own faces are declared here and loaded *in addition* to the variant's by `MenuFonts`.
 *
 * Return `[]` for templates whose faces already come through their variant (e.g. Café El Bahja's
 * Reem Kufi rides on the Médina package). URLs are de-duplicated against the variant's before load,
 * and the default template loads nothing to keep the ~150 KB initial budget intact.
 */
export interface TemplateFontUrl {
  /** The families this stylesheet carries, for documentation; only `url` is loaded. */
  families: string;
  url: string;
}

export function templateFonts(templateId: MenuTemplateId): readonly TemplateFontUrl[] {
  switch (templateId) {
    case 'mediterranea':
      // Pizzeria Mediterranea (MATRIX row 3): Archivo (loud condensed display, `wdth` axis for the
      // squeezed headline look) for Latin, Cairo for Arabic. One stylesheet, two families.
      return [
        {
          families: 'Archivo, Cairo',
          url: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Cairo:wght@400;600;700;900&display=swap',
        },
      ];
    case 'default':
    case 'vesuvio':
    case 'el-bahja':
    case 'marina':
      // Café Marina (MATRIX row 2): Geist + IBM Plex Sans Arabic — both already loaded as the app's
      // base sans, so no extra font request (keeps the clean, type-only specialty identity).
      return [];
    default:
      return [];
  }
}
