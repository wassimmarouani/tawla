import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * Supabase client bound to the request's auth cookies (Server Components, Server Actions,
 * Route Handlers). Uses the publishable key: every query runs under the user's RLS.
 * Server Components cannot write cookies; the proxy refreshes the session before they render
 * (ADR-0017), so the failed write there is expected and ignored.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: the proxy already refreshed the session.
          }
        },
      },
    },
  );
}
