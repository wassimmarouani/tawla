/**
 * Deterministic fixes for `drizzle-kit pull` output (ADR-0003), applied by clean-drizzle-pull.ts.
 * The SQL migrations are the schema source of truth; this file only has to give typed queries
 * stable, compilable table definitions. So policies and CHECK constraints are dropped (drizzle-kit
 * truncates nested CHECK SQL anyway), and everything else is put in a stable order, because
 * introspection returns tables, policies and constraints in no guaranteed order.
 */
const AUTH_USERS =
  "import { authUsers as users } from 'drizzle-orm/supabase';\n\n" +
  '// Kept for code that refers to auth.users under the introspected name.\n' +
  'export { users as usersInAuth };\n';

const EXTRAS_TYPE = 'PgTableExtraConfigValue';
const OPENERS = '([{';
const CLOSERS = ')]}';

/** Index of the bracket closing the one at `open`, skipping string and template literals. */
function matchingBracket(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (OPENERS.includes(char)) {
      depth += 1;
    } else if (CLOSERS.includes(char)) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unbalanced bracket at ${String(open)}`);
}

/** Top-level, comma-separated elements of an array literal body. */
export function splitTopLevel(body: string): string[] {
  const items: string[] = [];
  let start = 0;
  let index = 0;
  while (index < body.length) {
    const char = body.charAt(index);
    if (char === "'" || char === '"' || char === '`') {
      let end = index + 1;
      while (end < body.length && body.charAt(end) !== char)
        end += body.charAt(end) === '\\' ? 2 : 1;
      index = end + 1;
    } else if (OPENERS.includes(char)) {
      index = matchingBracket(body, index) + 1;
    } else if (char === ',') {
      items.push(body.slice(start, index));
      start = index + 1;
      index += 1;
    } else {
      index += 1;
    }
  }
  items.push(body.slice(start));
  return items.map((item) => item.trim()).filter(Boolean);
}

/**
 * Table extras: drop policies and CHECK constraints, sort the rest, keep the `table` parameter
 * only when used (noUnusedParameters), and type the callback (the restaurants <-> media FK cycle
 * otherwise makes table types circular, TS7022).
 */
export function normalizeExtras(source: string): string {
  const start = /\((table)?\) => \[/g;
  let output = '';
  let cursor = 0;
  for (let match = start.exec(source); match; match = start.exec(source)) {
    const open = match.index + match[0].length - 1;
    const close = matchingBracket(source, open);
    const items = splitTopLevel(source.slice(open + 1, close))
      .filter((item) => !/^(pgPolicy|check)\(/.test(item))
      .sort();
    const parameter = items.some((item) => /\btable\./.test(item)) ? 'table' : '';
    const body = items.length > 0 ? `\n${items.join(',\n')},\n` : '';
    output += `${source.slice(cursor, match.index)}(${parameter}): ${EXTRAS_TYPE}[] => [${body}]`;
    cursor = close + 1;
    start.lastIndex = cursor;
  }
  return output + source.slice(cursor);
}

/** Keeps only the pg-core imports the file still uses, plus the extras type when needed. */
export function pruneImports(source: string): string {
  const pattern = /import\s*\{([^}]*)\}\s*from\s*(["'])drizzle-orm\/pg-core\2;?/;
  const found = pattern.exec(source);
  if (!found) return source;
  const [statement, list = '', quote = "'"] = found;
  const rest = source.replace(statement, '');
  const names = list
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => new RegExp(`\\b${name.replace(/^type\s+/, '')}\\b`).test(rest));
  if (rest.includes(`${EXTRAS_TYPE}[]`) && !names.includes(`type ${EXTRAS_TYPE}`)) {
    names.push(`type ${EXTRAS_TYPE}`);
  }
  return source.replace(
    statement,
    `import { ${names.join(', ')} } from ${quote}drizzle-orm/pg-core${quote};`,
  );
}

/**
 * Tables sorted by name after every other top-level declaration (imports, enums). Safe: drizzle
 * resolves column references and extras lazily.
 */
export function sortTables(source: string): string {
  const parts = source.split(/(?=^export const \w+ = )/m);
  const isTable = (part: string) => /^export const \w+ = pgTable\(/.test(part);
  const name = (part: string) => /^export const (\w+)/.exec(part)?.[1] ?? '';
  const tables = parts
    .filter(isTable)
    .map((part) => (part.endsWith('\n') ? part : `${part}\n`))
    .sort((a, b) => name(a).localeCompare(name(b)));
  return [...parts.filter((part) => !isTable(part)), ...tables].join('');
}

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
    });

  const ordered = sortTables(pruneImports(normalizeExtras(fixed)));
  // Foreign keys to auth.users reference `users`, which introspecting `public` cannot declare.
  return /\busers\.id\b/.test(ordered) && !ordered.includes('authUsers as users')
    ? AUTH_USERS + ordered
    : ordered;
}
