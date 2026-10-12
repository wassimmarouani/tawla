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
    /** Enables /dev/* design prototypes. Never set in staging or production. */
    ENABLE_DEV_ROUTES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_DOMAIN: process.env.APP_DOMAIN,
    ENABLE_DEV_ROUTES: process.env.ENABLE_DEV_ROUTES,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
