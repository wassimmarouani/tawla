/**
 * Deterministic fixes for `drizzle-kit pull` quirks (ADR-0003), applied by clean-drizzle-pull.ts.
 */
const AUTH_USERS =
  "import { authUsers as users } from 'drizzle-orm/supabase';\n\n" +
  '// Kept for code that refers to auth.users under the introspected name.\n' +
  'export { users as usersInAuth };\n';

const EXTRAS_TYPE = 'PgTableExtraConfigValue';

export function fixSchema(source: string): string {
  const fixed = source
    // SQL function defaults are emitted as bare TS calls, e.g. default(random_token()).
    .replace(/\.default\(([a-z_][a-z0-9_]*)\(\)\)/g, '.default(sql`$1()`)')
    // Array defaults are mangled: `array['fr', 'ar']` becomes ["RAY['fr'::text", "'ar'::tex"]
    // and `'{}'` becomes [""]. Rebuild them from the quoted literals.
    .replace(/\.array\(\)\.default\(\[([^\]]*)\]\)/g, (match: string, inner: string) => {
      if (/^\s*(""|'')\s*$/.test(inner)) return '.array().default([])';
      const values = [...inner.matchAll(/'([^']*)'::/g)].map((literal) => literal[1] ?? '');
      return values.length > 0
        ? `.array().default([${values.map((value) => `'${value}'`).join(', ')}])`
        : match;
    })
    // Table extras that never read `table` trip noUnusedParameters.
    .replace(/\(table\) => \[([\s\S]*?)\n\]\)/g, (block: string, body: string) =>
      body.includes('table.') ? block : block.replace('(table) => [', '() => ['),
    )
    // Mutual foreign keys (restaurants <-> media) make table types circular (TS7022): an
    // explicit return type on every extras callback breaks the cycle.
    .replace(/\((table)?\) => \[/g, (_match: string, param: string | undefined) => {
      return `(${param ?? ''}): ${EXTRAS_TYPE}[] => [`;
    });

  // Runs before Prettier: the import may be on one line, with either quote style.
  const typed = fixed.includes(`${EXTRAS_TYPE}[]`)
    ? fixed.replace(
        /,?\s*\}\s*from\s*(["'])drizzle-orm\/pg-core\1/,
        (_match: string, quote: string) =>
          `, type ${EXTRAS_TYPE} } from ${quote}drizzle-orm/pg-core${quote}`,
      )
    : fixed;
  // drizzle-kit imports AnyPgColumn even when nothing uses it (noUnusedLocals).
  const imports =
    typed.split('AnyPgColumn').length === 2
      ? typed.replace(/\btype AnyPgColumn\s*,\s*/, '').replace(/,\s*type AnyPgColumn(?=\s*\})/, '')
      : typed;

  // Foreign keys to auth.users reference `users`, which introspecting `public` cannot declare.
  return /\busers\.id\b/.test(imports) && !imports.includes('authUsers as users')
    ? AUTH_USERS + imports
    : imports;
}
