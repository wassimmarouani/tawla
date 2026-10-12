/**
 * Fails when a table in `public` has RLS disabled or is not covered by any pgTAP test
 * (CLAUDE.md rule 2, ADR-0003). A test file covers a table by referencing `public.<table>`.
 * Usage: pnpm check:rls   (DATABASE_URL_DIRECT overrides the local Supabase default)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const TESTS_DIR = path.resolve('supabase/tests');

const url = process.env.DATABASE_URL_DIRECT ?? LOCAL_DATABASE_URL;
const sql = postgres(url, { max: 1, onnotice: () => undefined });

try {
  const tables = await sql<{ name: string; rls: boolean }[]>`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by c.relname
  `;

  const testFiles = (await readdir(TESTS_DIR)).filter((file) => file.endsWith('.sql'));
  const testSources = await Promise.all(
    testFiles.map((file) => readFile(path.join(TESTS_DIR, file), 'utf8')),
  );
  const corpus = testSources.join('\n');

  const withoutRls = tables.filter((table) => !table.rls).map((table) => table.name);
  const untested = tables
    .filter((table) => !new RegExp(`\\bpublic\\.${table.name}\\b`).test(corpus))
    .map((table) => table.name);

  process.stdout.write(
    `Checked ${String(tables.length)} tables against ${String(testFiles.length)} test files.\n`,
  );
  if (withoutRls.length > 0) process.stderr.write(`RLS disabled: ${withoutRls.join(', ')}\n`);
  if (untested.length > 0)
    process.stderr.write(`No pgTAP test references: ${untested.join(', ')}\n`);
  process.exitCode = withoutRls.length > 0 || untested.length > 0 ? 1 : 0;
} finally {
  await sql.end();
}
