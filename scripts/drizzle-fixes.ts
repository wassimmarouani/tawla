/**
 * Deterministic fixes for `drizzle-kit pull` quirks (ADR-0003), applied by clean-drizzle-pull.ts.
 */
const AUTH_USERS =
  "import { authUsers as users } from 'drizzle-orm/supabase';\n\n" +
  '// relations.ts refers to auth.users under this name.\n' +
  'export { users as usersInAuth };\n';

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
    );
  // Foreign keys to auth.users reference `users`, which introspecting `public` cannot declare.
  return /\busers\.id\b/.test(fixed) && !fixed.includes('authUsers as users')
    ? AUTH_USERS + fixed
    : fixed;
}
