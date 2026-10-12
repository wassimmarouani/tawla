# ADR-0002 — Stack baseline and dependency version policy

- Status: Accepted
- Date: 2026-10-11
- Audit refs: spec §9.1, T1, T9, T10, T11, Q6

## Context

The spec asks for the "latest stable" of each technology. The npm registry was queried on 2026-10-11, and peer-dependency compatibility was checked with `npm view <pkg> peerDependencies`.

## Decision

### Version policy

1. **Exact pins** in `package.json`, no `^` or `~`. Each version must have been **published at least 14 days earlier** (supply-chain safety). This is enforced by `minimumReleaseAge: 20160` (minutes) in `pnpm-workspace.yaml`.
2. **Exception: security releases** are adopted as soon as published, after CI passes. A Next.js out-of-band security release is announced for 2026-10-14; Phase 0 pins that patched 16.x release.
3. Dependabot opens weekly grouped PRs. Majors need an ADR if they change APIs we rely on.
4. Toolchain:
   - Node **24 LTS** (`engines` + `.nvmrc`);
   - pnpm **12.7.0** via `packageManager`, activated with **corepack 0.36.0** (the corepack 0.34 bundled with Node 24.11 can't run pnpm 12's native binaries; installed user-level).

### Runtime and UI

| Concern         | Package                                                                  | Pin (≥ 14 days)                     | Note                                                                                               |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Framework       | next                                                                     | 16.3.6 → patched 16.x on 2026-10-14 | 16.4.0 (2026-10-06) is too recent unless it's the security line                                    |
| UI runtime      | react / react-dom                                                        | 19.3.0                              | Stable View Transitions (`<ViewTransition>`)                                                       |
| Language        | typescript                                                               | **6.0.3**                           | **Not 7.x:** typescript-eslint 8.70 peer is `typescript <6.1.0`. Re-evaluate once it supports TS 7 |
| CSS             | tailwindcss, @tailwindcss/postcss                                        | 4.3.3                               | CSS-first `@theme` tokens                                                                          |
| Components      | shadcn (CLI)                                                             | 4.21.0                              | Components copied into `src/components/ui`                                                         |
| Primitives      | @base-ui/react                                                           | 1.8.0                               | **shadcn default since July 2026.** Its Drawer replaces vaul (unmaintained)                        |
| Animation       | motion                                                                   | **13.4.4**                          | v14 (2026-10-02) too recent. `LazyMotion` + `m` (≈ 4.6 KB initial)                                 |
| Icons           | lucide-react                                                             | 1.48.0                              |                                                                                                    |
| Forms           | react-hook-form 7.89.0, @hookform/resolvers 5.9.1                        |                                     | Resolvers support Zod 4                                                                            |
| Validation      | zod                                                                      | 4.6.5                               | Shared client/server schemas                                                                       |
| Server state    | @tanstack/react-query                                                    | 5.104.0                             | Staff app and back-office only (ADR-0020)                                                          |
| Client state    | zustand                                                                  | 5.0.15                              | Cart                                                                                               |
| i18n            | next-intl                                                                | 4.14.7                              | `proxy.ts` integration                                                                             |
| Toasts          | sonner                                                                   | 2.0.8                               |                                                                                                    |
| Command palette | cmdk                                                                     | 1.1.1                               | Back-office Cmd/Ctrl+K                                                                             |
| Charts          | recharts                                                                 | 3.10.1                              | Through shadcn charts (Phase 3)                                                                    |
| Colour maths    | culori                                                                   | 4.0.2                               | OKLCH brand scale and contrast checks                                                              |
| Drag and drop   | @dnd-kit/core                                                            | 6.3.1                               | Menu editor ordering                                                                               |
| Fuzzy search    | @leeoniya/ufuzzy                                                         | 1.0.19                              | Lazy-loaded on search focus                                                                        |
| Theme           | next-themes                                                              | 0.4.6                               | Light / dark / system                                                                              |
| Class utils     | class-variance-authority 0.7.1, tailwind-merge 3.7.0, clsx 2.1.1         |                                     |                                                                                                    |
| Fonts           | @fontsource-variable/inter 5.3.0, @fontsource/ibm-plex-sans-arabic 5.3.0 |                                     | Final pairing chosen with the visual direction (ADR-0027). Self-hosted and subset                  |

### Data, backend, services

| Concern          | Package                                                           | Pin                             |
| ---------------- | ----------------------------------------------------------------- | ------------------------------- |
| Supabase client  | @supabase/supabase-js / @supabase/ssr                             | 2.117.2 / 0.12.7                |
| Supabase CLI     | supabase (devDependency, run via pnpm)                            | 2.118.0                         |
| ORM              | drizzle-orm / drizzle-kit                                         | 0.45.3 / 0.31.11 (1.0 still RC) |
| Postgres driver  | postgres                                                          | 3.4.9                           |
| Env validation   | @t3-oss/env-nextjs                                                | 0.13.11                         |
| Tokens / cookies | jose                                                              | 6.2.12                          |
| Rate limit       | @upstash/ratelimit / @upstash/redis                               | 2.2.0 / 1.39.0                  |
| Web Push         | web-push                                                          | 3.6.7 (stable, low churn)       |
| Email            | resend 6.30.0, react-email 6.11.0, @react-email/components 1.0.12 |                                 |
| QR               | qrcode                                                            | 1.5.4                           |
| Images           | sharp 0.35.5, thumbhash 0.1.1                                     | ADR-0018                        |
| AI               | @anthropic-ai/sdk                                                 | 0.128.0 (ADR-0025)              |
| Errors           | @sentry/nextjs                                                    | 11.0.0                          |
| Analytics        | posthog-node 5.54.1 (server), posthog-js 1.434.15 (deferred)      | ADR-0020                        |
| Service worker   | serwist (core) + esbuild                                          | ADR-0022                        |

### Tooling

| Concern                | Packages                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit / component tests | vitest 5.0.2, @vitest/coverage-v8 5.0.2, vite 8.3.1, @vitejs/plugin-react 6.1.1, jsdom 30.1.1, @testing-library/react 16.3.3, @testing-library/dom 10.4.2, @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.7                                                                                                                                                                                 |
| E2E + screenshots      | @playwright/test 1.63.0                                                                                                                                                                                                                                                                                                                                                                                        |
| Accessibility          | @axe-core/playwright 4.13.0                                                                                                                                                                                                                                                                                                                                                                                    |
| Lint                   | **eslint 9.39.5** (not 10: the eslint-plugin-react / jsx-a11y / import plugins bundled by eslint-config-next cap their peer at ESLint 9), @eslint/js 9.39.5, typescript-eslint 8.70.1, eslint-config-next 16.3.6, local plugin `tooling/eslint-plugin-tawla` + `tooling/eslint/restrictions.mjs` for project rules (replaces eslint-plugin-boundaries). `next lint` was removed in Next 16; use the ESLint CLI |
| Format                 | prettier 3.9.9, prettier-plugin-tailwindcss 0.8.1                                                                                                                                                                                                                                                                                                                                                              |
| Git hooks              | husky 9.1.7, lint-staged 17.6.0, @commitlint/cli 21.2.3, @commitlint/config-conventional 21.2.3                                                                                                                                                                                                                                                                                                                |
| Bundle budget          | size-limit 14.1.0, @size-limit/preset-app 14.1.0                                                                                                                                                                                                                                                                                                                                                               |
| Scripts                | tsx 4.23.15                                                                                                                                                                                                                                                                                                                                                                                                    |
| DB tests               | pgTAP via `supabase test db`                                                                                                                                                                                                                                                                                                                                                                                   |
| Load tests             | k6 binary (not npm), Phase 2                                                                                                                                                                                                                                                                                                                                                                                   |

Spec items we drop:

- `vaul`: unmaintained, replaced by the Base UI Drawer.
- `@react-pdf/renderer`: open Arabic shaping bugs (ADR-0019).
- `@serwist/next`: webpack-only (ADR-0022).
- Tremor: replaced by shadcn charts.

## Consequences

- Each Phase 0 install re-checks these pins with `scripts/check-versions.mjs`, which reports newer stable versions. Bumps go through PRs.
- TypeScript 7's speed is given up until typescript-eslint supports it.

## Sources

- npm registry queried 2026-10-11 (versions, publish dates, peerDependencies)
- https://github.com/emilkowalski/vaul (README: "This repo is unmaintained")
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default · https://ui.shadcn.com/docs/components/drawer
- https://motion.dev/docs/react-reduce-bundle-size
- https://nextjs.org/blog (security release announced for 2026-10-14)

## Amendments

- **2026-10-12 (P0-01):** ESLint pinned to 9.39.5 instead of 10.x (peer caps of the plugins bundled by eslint-config-next). `eslint-plugin-boundaries` replaced by a small local plugin plus `no-restricted-imports` rules, fewer dependencies and fully tested. `@types/node` pinned to the Node 24 line (24.19.0) to match the runtime. pnpm 12 stores build-script approvals under `allowBuilds` in `pnpm-workspace.yaml`.
