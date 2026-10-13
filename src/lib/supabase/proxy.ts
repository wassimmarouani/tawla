import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface ProxySession {
  isAuthenticated: boolean;
  /** Refreshed auth cookies to copy onto the outgoing response. */
  cookiesToSet: CookieToSet[];
}

/**
 * Refreshes the Supabase session from `proxy.ts` (ADR-0017): verifies the access token and,
 * when it has expired, rotates it with the refresh token. Refreshed cookies are written to the
 * incoming request (so Server Components see them) and returned for the response.
 * Talks to Supabase Auth only, never to the database.
 */
export async function refreshProxySession(request: NextRequest): Promise<ProxySession> {
  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const cookie of cookies) {
            request.cookies.set(cookie.name, cookie.value);
            cookiesToSet.push(cookie);
          }
        },
      },
    },
  );
  const { data, error } = await supabase.auth.getClaims();
  return { isAuthenticated: !error && Boolean(data?.claims.sub), cookiesToSet };
}
