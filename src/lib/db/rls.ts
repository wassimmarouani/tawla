import 'server-only';
import { sql } from 'drizzle-orm';
import { rawDb, type Database } from './client';

export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Claims of a verified Supabase access token (shape added by the custom access token hook). */
export interface RlsClaims {
  role: 'authenticated' | 'anon';
  sub?: string;
  memberships?: readonly { restaurant_id: string; role: string }[];
  platform_role?: 'none' | 'super_admin' | 'support';
  aal?: 'aal1' | 'aal2';
  [claim: string]: unknown;
}

/**
 * Runs `fn` in a transaction where Postgres enforces RLS for the given claims (ADR-0003):
 * the claims are exposed to auth.jwt()/auth.uid() and the role is switched to `authenticated`
 * or `anon`. Both settings are transaction-local, so pooled connections never leak them.
 * Callers must pass claims from a verified token (supabase.auth.getClaims()), never user input.
 */
export async function withRls<T>(
  claims: RlsClaims,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const role = claims.role === 'authenticated' ? 'authenticated' : 'anon';
  return rawDb().transaction(async (tx) => {
    await tx.execute(sql`
      select
        set_config('request.jwt.claims', ${JSON.stringify(claims)}, true),
        set_config('request.jwt.claim.sub', ${claims.sub ?? ''}, true),
        set_config('role', ${role}, true)
    `);
    return fn(tx);
  });
}
