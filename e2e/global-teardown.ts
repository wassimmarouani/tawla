import postgres from 'postgres';

/** Accounts created by the E2E suites (sign-up journeys and screen checks). */
const TEST_ACCOUNT_PATTERNS = [
  'owner-%@example.org',
  'screens-%@example.org',
  'service-%@example.org',
];

/**
 * Removes E2E accounts and the venues they own, so the local database stays clean for pgTAP
 * and integration suites (which assume no foreign tenants).
 */
export default async function globalTeardown() {
  const sql = postgres(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    { onnotice: () => undefined },
  );
  try {
    for (const pattern of TEST_ACCOUNT_PATTERNS) {
      await sql`
        with gone as (
          delete from public.restaurants where id in (
            select m.restaurant_id from public.memberships m
            join auth.users u on u.id = m.user_id
            where u.email like ${pattern})
          returning organization_id)
        delete from public.organizations where id in (select organization_id from gone)
      `;
      await sql`delete from auth.users where email like ${pattern}`;
    }
  } finally {
    await sql.end();
  }
}
