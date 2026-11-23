import type { MenuTemplateId } from '../templates/ids';
import { templateFonts } from '../templates/fonts';
import { variantFonts, type MenuVariant } from '@/lib/menu/variants';

/**
 * Loads the Google Fonts a menu needs (spec 02 amended): the recolor `variant`'s faces plus any the
 * active named `template` adds on top (see `templateFonts`). Each `<link>` lives in the document head
 * (Next.js hoists `<link>`s rendered from a Server Component); URLs are de-duplicated so a face shared
 * by variant and template loads once. The default variant + default template render nothing and keep
 * the ~150 KB initial budget intact.
 */
export function VariantFonts({
  variant,
  templateId,
}: {
  variant: MenuVariant;
  templateId: MenuTemplateId;
}) {
  const fonts = variantFonts(variant);
  const urls = [
    fonts.display?.url,
    fonts.body?.url,
    ...templateFonts(templateId).map((font) => font.url),
  ].filter((url): url is string => typeof url === 'string');
  const unique = [...new Set(urls)];
  if (unique.length === 0) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {unique.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
    </>
  );
}
