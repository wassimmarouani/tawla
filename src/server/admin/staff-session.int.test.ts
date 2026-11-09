import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { localSupabase } from '../../../tooling/testing/local-supabase';
import { createShadowUser, mintSession, revokeSessions, shadowEmail } from './staff-session';

/**
 * P0-09 spike, kept as the permanent suite for shadow-user sessions (ADR-0010).
 * Requires local Supabase (pnpm db:start).
 */

const ID = {
  org: '14000000-0000-4000-8000-000000000001',
  restaurant: '24000000-0000-4000-8000-00000000000a',
  membership: '34000000-0000-4000-8000-00000000000a',
} as const;
const STAFF_DOMAIN = 'staff.taply.app';
const EMAIL = shadowEmail(ID.membership, STAFF_DOMAIN);
const MAILPIT = 'http://127.0.0.1:54324/api/v1/messages';

let userId = '';

function decodeClaims(token: string): Record<string, unknown> {
  const [, payload = ''] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

async function mailCount(): Promise<number> {
  const response = await fetch(MAILPIT);
  const body = (await response.json()) as { total?: number };
  return body.total ?? 0;
}

async function cleanup() {
  const db = rawDb();
  await db.execute(sql`delete from public.restaurants where id = ${ID.restaurant}`);
  await db.execute(sql`delete from public.organizations where id = ${ID.org}`);
  await db.execute(sql`delete from auth.users where email = ${EMAIL}`);
}

beforeAll(async () => {
  await cleanup();
  const db = rawDb();
  await db.execute(
    sql`insert into public.organizations (id, name) values (${ID.org}, 'Staff Org')`,
  );
  await db.execute(sql`
    insert into public.restaurants (id, organization_id, slug, name)
    values (${ID.restaurant}, ${ID.org}, 'staff-spike-cafe', 'Staff Spike Café')
  `);
  userId = await createShadowUser(localSupabase(), EMAIL);
  await db.execute(sql`
    insert into public.memberships (id, restaurant_id, user_id, role, display_name)
    values (${ID.membership}, ${ID.restaurant}, ${userId}, 'waiter', 'Sami')
  `);
}, 60_000);

afterAll(cleanup);

describe('shadow staff sessions (ADR-0010)', () => {
  it('creates a confirmed user whose password nobody knows', async () => {
    // GoTrue stores a random bcrypt hash when the admin API creates a user without a password.
    const [row] = await rawDb().execute<{ bcrypt: boolean; confirmed: boolean }>(sql`
      select encrypted_password like '$2a$%' as bcrypt, email_confirmed_at is not null as confirmed
      from auth.users where id = ${userId}
    `);
    expect(row).toEqual({ bcrypt: true, confirmed: true });

    const { apiUrl, publishableKey } = localSupabase();
    const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
    const attempt = await client.auth.signInWithPassword({ email: EMAIL, password: '' });
    expect(attempt.error).not.toBeNull();
  });

  it('mints a real session carrying the hook claims, without sending any email', async () => {
    const before = await mailCount();
    const session = await mintSession(localSupabase(), EMAIL);
    expect(await mailCount()).toBe(before);

    expect(session.userId).toBe(userId);
    const claims = decodeClaims(session.accessToken);
    expect(claims.role).toBe('authenticated');
    expect(claims.memberships).toEqual([{ restaurant_id: ID.restaurant, role: 'waiter' }]);
  });

  it('works with RLS through the Data API like any signed-in user', async () => {
    const session = await mintSession(localSupabase(), EMAIL);
    const { apiUrl, publishableKey } = localSupabase();
    const client = createClient(apiUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    });
    const { data, error } = await client.from('restaurants').select('slug');
    expect(error).toBeNull();
    expect(data).toEqual([{ slug: 'staff-spike-cafe' }]);
  });

  it('accepts each magic-link token only once', async () => {
    const { apiUrl, publishableKey, secretKey } = localSupabase();
    const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
    expect(link.error).toBeNull();
    const tokenHash = link.data.properties?.hashed_token ?? '';

    const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
    const first = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    expect(first.error).toBeNull();
    const second = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    expect(second.error).not.toBeNull();
  });

  it('revocation invalidates the refresh token (remote logout)', async () => {
    const session = await mintSession(localSupabase(), EMAIL);
    await revokeSessions(localSupabase(), session.accessToken);

    const { apiUrl, publishableKey } = localSupabase();
    const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
    const refreshed = await client.auth.refreshSession({ refresh_token: session.refreshToken });
    expect(refreshed.error).not.toBeNull();
  });

  it('leaves an already-issued access token valid until it expires (bounded by jwt_expiry)', async () => {
    const session = await mintSession(localSupabase(), EMAIL);
    await revokeSessions(localSupabase(), session.accessToken);

    const { apiUrl, publishableKey } = localSupabase();
    const client = createClient(apiUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    });
    const { data } = await client.from('restaurants').select('slug');
    expect(data).toEqual([{ slug: 'staff-spike-cafe' }]);
    expect(session.expiresAt - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(600);
  });
});
