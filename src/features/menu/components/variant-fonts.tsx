import { variantFonts, type MenuVariant } from '@/lib/menu/variants';

/**
 * Loads the Google Fonts needed for a menu variant (spec 02 amended). Each link lives in the
 * document head; Next.js hoists any `<link>` rendered from a Server Component. The default
 * variant renders nothing and keeps the ~150 KB initial budget intact.
 */
export function VariantFonts({ variant }: { variant: MenuVariant }) {
  const fonts = variantFonts(variant);
  const urls = [fonts.display?.url, fonts.body?.url].filter(
    (url): url is string => typeof url === 'string',
  );
  if (urls.length === 0) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {urls.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
    </>
  );
}
