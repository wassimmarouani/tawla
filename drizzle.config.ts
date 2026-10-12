import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit is used for INTROSPECTION only (`pnpm db:pull`). SQL migrations in
 * supabase/migrations are the schema source of truth (ADR-0003); never run drizzle-kit generate/push.
 */
export default defineConfig({
  dialect: 'postgresql',
  out: './src/lib/db/schema',
  schemaFilter: ['public'],
  dbCredentials: {
    url:
      process.env.DATABASE_URL_DIRECT ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  introspect: { casing: 'camel' },
});
