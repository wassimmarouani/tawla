import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Staff session minting for shadow users (ADR-0010). A staff member authenticated by our own
 * check (paired device + PIN, Phase 2) gets a genuine Supabase session, so RLS, Realtime
 * authorization and token refresh work exactly as for email users.
 *
 * Mechanism: auth.admin.generateLink({ type: 'magiclink' }) returns a hashed token without
 * sending any email; verifyOtp({ token_hash, type: 'email' }) exchanges it for a session.
 * The token is single-use (verified by staff-session.int.test.ts).
 */

export interface SupabaseServerConfig {
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
}

export interface MintedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

const NO_PERSISTENCE = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Synthetic, never-delivered address of a shadow staff user (ADR-0010 §2). */
export function shadowEmail(membershipId: string, staffEmailDomain: string): string {
  return `m-${membershipId}@${staffEmailDomain}`;
}

export async function createShadowUser(
  config: SupabaseServerConfig,
  email: string,
): Promise<string> {
  const admin = createClient(config.apiUrl, config.secretKey, NO_PERSISTENCE);
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

/**
 * Mints a session for an existing user. Callers MUST have authenticated the person first
 * (device token + PIN, lockout) — this function performs no credential check by design.
 */
export async function mintSession(
  config: SupabaseServerConfig,
  email: string,
): Promise<MintedSession> {
  const admin = createClient(config.apiUrl, config.secretKey, NO_PERSISTENCE);
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;

  const client = createClient(config.apiUrl, config.publishableKey, NO_PERSISTENCE);
  const verified = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'email',
  });
  if (verified.error) throw verified.error;
  const { session } = verified.data;
  if (!session) throw new Error('verifyOtp returned no session');

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    userId: session.user.id,
  };
}

/** Revokes every refresh token of the user (remote logout, device revocation). */
export async function revokeSessions(
  config: SupabaseServerConfig,
  accessToken: string,
): Promise<void> {
  const admin = createClient(config.apiUrl, config.secretKey, NO_PERSISTENCE);
  const { error } = await admin.auth.admin.signOut(accessToken, 'global');
  if (error) throw error;
}
