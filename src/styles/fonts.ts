import { Geist, IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * Typefaces (ADR-0029), self-hosted and subset by next/font at build time (no request to Google
 * at runtime). Geist is preloaded; IBM Plex Sans Arabic is not: its unicode-range makes the
 * browser fetch it only when Arabic glyphs render, so French and English pages never pay for it.
 */
export const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${geist.variable} ${plexArabic.variable}`;
