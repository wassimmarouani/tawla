import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema/schema';

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;

/**
 * Raw database client. It connects as a privileged role and BYPASSES RLS, so it may only be
 * imported by src/lib/db/** and src/server/admin/** (lint-enforced, ADR-0003). Feature code
 * uses withRls() from ./rls.
 */
export function rawDb(): Database {
  database ??= drizzle(
    postgres(env.DATABASE_URL, {
      // Supavisor transaction pooler does not support prepared statements.
      prepare: false,
      max: env.NODE_ENV === 'production' ? 5 : 10,
      onnotice: () => undefined,
    }),
    { schema },
  );
  return database;
}
