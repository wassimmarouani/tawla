import { Cairo, Geist, IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

// next/font self-hosts and subsets these at build time (no runtime request to Google).
export const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist' });
export const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' });
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
});
export const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });

export const LATIN_FONTS = { geist, inter } as const;
export const ARABIC_FONTS = { plex: plexArabic, cairo } as const;
