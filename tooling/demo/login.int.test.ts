import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { localSupabase } from '../testing/local-supabase';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo';

/** The seeded demo accounts log in through GoTrue with the expected membership claims. */
describe('demo accounts (P0-12)', () => {
  it.each(Object.entries(DEMO_ACCOUNTS))('%s can log in', async (_name, account) => {
    const { apiUrl, publishableKey } = localSupabase();
    const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({
      email: account.email,
      password: DEMO_PASSWORD,
    });
    expect(error).toBeNull();
    const claims = JSON.parse(
      Buffer.from(data.session?.access_token.split('.')[1] ?? '', 'base64url').toString(),
    ) as { memberships: { role: string }[] };
    expect(claims.memberships).toEqual([expect.objectContaining({ role: account.role })]);

    const { data: rows } = await client.from('restaurants').select('slug');
    expect(rows).toEqual([{ slug: account.restaurant }]);
  });
});
