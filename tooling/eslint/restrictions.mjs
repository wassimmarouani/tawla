// @ts-check
/**
 * Project-specific lint restrictions (CLAUDE.md rules 7, 8, 9, 17; ADR-0003; 07-architecture).
 * Kept separate from eslint.config.mjs so they can be tested without type information.
 */
import tawla from '../eslint-plugin-tawla/index.mjs';

const featureDeepImport = {
  group: ['@/features/*/*'],
  message: 'Import other features only through their public index: "@/features/<name>".',
};

const rawDbClient = {
  group: ['@/lib/db/client', '@/lib/db/client/*'],
  message:
    'The raw DB client bypasses RLS. Use withRls() from "@/lib/db/rls", or a function in src/server/admin (ADR-0003).',
};

const adminModule = {
  group: ['@/server/admin', '@/server/admin/*'],
  message:
    'Privileged code may only be called from route handlers (src/app/api) or feature server adapters (src/features/*/server) (ADR-0003).',
};

const impureForServices = {
  group: [
    'next',
    'next/*',
    '@/lib/db',
    '@/lib/db/*',
    '@/lib/supabase',
    '@/lib/supabase/*',
    '@/server/*',
  ],
  message:
    'services/ must stay pure: no React, Next.js, database or Supabase imports (CLAUDE.md rule 9).',
};

/** @type {import('eslint').Linter.Config[]} */
export const projectRestrictions = [
  {
    name: 'tawla/source',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { tawla },
    rules: {
      'tawla/no-physical-direction-classes': 'error',
      'tawla/no-arbitrary-tailwind-values': 'error',
      // Structured logging only (src/lib/log.ts, ADR-0020).
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: [featureDeepImport, rawDbClient, adminModule] },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables through "@/lib/env" (validated at boot).',
        },
      ],
    },
  },
  {
    name: 'tawla/admin-callers',
    files: ['src/app/api/**/*.{ts,tsx}', 'src/features/*/server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [featureDeepImport, rawDbClient] }],
    },
  },
  {
    name: 'tawla/privileged-modules',
    files: ['src/server/admin/**/*.{ts,tsx}', 'src/lib/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [featureDeepImport] }],
    },
  },
  {
    name: 'tawla/env-readers',
    files: ['src/lib/env.ts', 'src/server/admin/env.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    name: 'tawla/pure-services',
    files: ['src/features/*/services/**/*.{ts,tsx}', 'src/lib/*/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: impureForServices.message },
            { name: 'react-dom', message: impureForServices.message },
          ],
          patterns: [featureDeepImport, rawDbClient, adminModule, impureForServices],
        },
      ],
    },
  },
  {
    name: 'tawla/todo',
    files: ['**/*.{ts,tsx,mjs,js}'],
    plugins: { tawla },
    rules: {
      'tawla/todo-requires-issue': 'error',
      'tawla/no-invisible-characters': 'error',
    },
  },
];
