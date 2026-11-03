import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Validated environment (docs/setup.md). Server-only secrets used by privileged code live in
 * src/server/admin/env.ts, never here (ADR-0003).
 */
export const env = createEnv({
  shared: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  server: {
    APP_DOMAIN: z.string().min(1),
    /** Postgres URL (Supavisor transaction pooler in hosted envs). Used by src/lib/db only. */
    DATABASE_URL: z.url(),
    /** Enables /dev/* design prototypes. Never set in staging or production. */
    /** HS256 key of the customer session cookie (ADR-0011): 32+ random characters. */
    CLIENT_SESSION_SECRET: z.string().min(32),
    /** Rate limits (ADR-0011 §7); both empty locally → in-memory adapter. */
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    /** Scales every rate limit; E2E suites log in hundreds of times from one IP. */
    RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
    /**
     * Cloudflare Turnstile, asked only when the anomaly heuristic fires (ADR-0011 §3). Defaults
     * are Cloudflare's public test keys (always pass); hosted envs set real ones (P1-17).
     */
    TURNSTILE_SECRET_KEY: z.string().min(1).default('1x0000000000000000000000000000000AA'),
    ENABLE_DEV_ROUTES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    /** Publishable (formerly anon) key: safe in the browser, RLS applies (ADR-0024). */
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).default('1x00000000000000000000BB'),
    /** Web Push VAPID public key (ADR-0022); push is disabled when unset. */
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(40).optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_DOMAIN: process.env.APP_DOMAIN,
    DATABASE_URL: process.env.DATABASE_URL,
    CLIENT_SESSION_SECRET: process.env.CLIENT_SESSION_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RATE_LIMIT_MULTIPLIER: process.env.RATE_LIMIT_MULTIPLIER,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    ENABLE_DEV_ROUTES: process.env.ENABLE_DEV_ROUTES,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
