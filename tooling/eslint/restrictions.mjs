// @ts-check
/**
 * Project-specific lint restrictions (CLAUDE.md rules 7, 8, 9, 17; ADR-0003; 07-architecture).
 * Kept separate from eslint.config.mjs so they can be tested without type information.
 */
import taply from '../eslint-plugin-taply/index.mjs';

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
    name: 'taply/source',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { taply },
    rules: {
      'taply/no-physical-direction-classes': 'error',
      'taply/no-arbitrary-tailwind-values': 'error',
      'taply/client-module-exports': 'error',
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
    // Vendored shadcn/Base UI primitives: internal calc() geometry is tolerated, colours are not
    // (they must come from tokens). Logical-direction rules still apply.
    name: 'taply/ui-primitives',
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'taply/no-arbitrary-tailwind-values': ['error', { allowGeometry: true }] },
  },
  {
    name: 'taply/admin-callers',
    files: ['src/app/api/**/*.{ts,tsx}', 'src/features/*/server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [featureDeepImport, rawDbClient] }],
    },
  },
  {
    name: 'taply/privileged-modules',
    files: ['src/server/admin/**/*.{ts,tsx}', 'src/lib/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [featureDeepImport] }],
    },
  },
  {
    // Integration tests build fixtures as a privileged role (they verify RLS, they are not app code).
    name: 'taply/integration-tests',
    files: ['src/**/*.int.test.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [featureDeepImport] }] },
  },
  {
    // Customer menu (ADR-0020: < 150 KB initial JS). `cn` ships a Tailwind class merger and the
    // states barrel ships client components; use '@/lib/classes' and direct state imports.
    name: 'taply/customer-menu-budget',
    files: ['src/features/menu/components/**/*.{ts,tsx}', 'src/components/media/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/utils',
              message: 'Use classes() from "@/lib/classes" in the customer menu (bundle budget).',
            },
            {
              name: '@/components/states',
              message: 'Import the state component file directly (the barrel ships client code).',
            },
          ],
          patterns: [featureDeepImport, rawDbClient, adminModule],
        },
      ],
    },
  },
  {
    name: 'taply/env-readers',
    files: ['src/lib/env.ts', 'src/server/admin/env.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    name: 'taply/pure-services',
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
    name: 'taply/todo',
    files: ['**/*.{ts,tsx,mjs,js}'],
    plugins: { taply },
    rules: {
      'taply/todo-requires-issue': 'error',
      'taply/no-invisible-characters': 'error',
    },
  },
];
