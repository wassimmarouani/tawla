import { serializeJsonLd } from '../services/structured-data';

/**
 * Structured data for search engines. React renders <script> children as raw text (and itself
 * neutralises `</script`); serializeJsonLd also escapes `<`, `>` and `&`, so no
 * dangerouslySetInnerHTML is needed (CLAUDE.md rule 14).
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
