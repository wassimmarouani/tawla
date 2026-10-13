import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { log } from '@/lib/log';
import { sessionClaimsSchema, type SessionClaims } from './claims';
import { loginPathFor } from './next-path';

/**
 * Verified claims of the signed-in user, or null. `getClaims()` verifies the JWT (signature and
 * expiry), unlike `getSession()`, so the result can drive authorization. Cached per request.
 */
export const getSessionClaims = cache(async (): Promise<SessionClaims | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const parsed = sessionClaimsSchema.safeParse(data.claims);
  if (!parsed.success) {
    log.warn('auth.claims_invalid', { issues: parsed.error.issues.length });
    return null;
  }
  return parsed.data;
});

/** Claims of the signed-in user; otherwise redirects to the login page, then back to `from`. */
export async function requireSessionClaims(from: string): Promise<SessionClaims> {
  const claims = await getSessionClaims();
  if (!claims) redirect(loginPathFor(from));
  return claims;
}
