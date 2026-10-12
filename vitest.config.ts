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
          include: ['src/**/*.test.ts', 'tooling/**/*.test.mjs', 'scripts/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
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
          include: ['src/**/*.int.test.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          env: {
            DATABASE_URL: LOCAL_DATABASE_URL,
            APP_DOMAIN: 'localhost:3000',
            NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
            NEXT_PUBLIC_APP_NAME: 'Tawla',
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/features/*/services/**', 'src/lib/**', 'src/i18n/locales.ts'],
      // src/lib/db is exercised by the integration suite (pnpm test:integration), not unit tests.
      exclude: ['**/*.test.*', 'src/lib/env.ts', 'src/lib/db/**'],
      // CLAUDE.md rule 9: ≥ 90 % on business logic.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
