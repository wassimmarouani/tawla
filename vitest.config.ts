import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  'server-only': fileURLToPath(new URL('./tooling/vitest/server-only.ts', import.meta.url)),
};

const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/**/*.test.ts',
            'tooling/**/*.test.ts',
            'tooling/**/*.test.mjs',
            'scripts/**/*.test.ts',
          ],
          exclude: ['**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          // Requires local Supabase (pnpm db:start). Run with pnpm test:integration.
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts', 'tooling/**/*.int.test.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          env: {
            DATABASE_URL: LOCAL_DATABASE_URL,
            APP_DOMAIN: 'localhost:3000',
            NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
            NEXT_PUBLIC_APP_NAME: 'Tawla',
            NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
            CLIENT_SESSION_SECRET: 'local-development-client-session-secret-0123456789',
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/features/*/services/**', 'src/lib/**', 'src/i18n/locales.ts'],
      // src/lib/db is exercised by the integration suite (pnpm test:integration); the Supabase
      // cookie glue (src/lib/supabase, src/lib/auth/session.ts) by the E2E auth journeys.
      exclude: [
        '**/*.test.*',
        'src/lib/env.ts',
        'src/lib/db/**',
        'src/lib/supabase/**',
        'src/lib/auth/session.ts',
        // Adapter selection from env; the adapters themselves are unit-tested.
        'src/lib/rate-limit/index.ts',
        'src/lib/auth/throttle.ts',
        // Browser websocket glue, exercised by the E2E table-service journeys.
        'src/lib/realtime/customer-channel.ts',
      ],
      // CLAUDE.md rule 9: ≥ 90 % on business logic.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
