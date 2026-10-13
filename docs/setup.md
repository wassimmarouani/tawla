# Local environment setup

Target: any developer (or Claude Code session) goes from clone to a running demo café in < 15 minutes. **Never use production credentials locally.**

## Prerequisites

| Tool                | Version                                                                 | Notes                                                                                                      |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Node.js             | 24 LTS (`.nvmrc`)                                                       |                                                                                                            |
| corepack            | **0.36.0**                                                              | Node 24.11 ships corepack 0.34, which can't run pnpm 12. `npm i -g corepack@0.36.0`                        |
| pnpm                | 12.7.0 (pinned via `packageManager`)                                    | `corepack enable pnpm` (Windows without admin: `corepack enable pnpm --install-directory "%APPDATA%\npm"`) |
| Docker              | Docker Desktop running                                                  | Required by Supabase local                                                                                 |
| Supabase CLI        | pinned devDependency `supabase`                                         | Run through `pnpm supabase …` (no global install)                                                          |
| Git                 | ≥ 2.39                                                                  |                                                                                                            |
| Playwright browsers | installed by `pnpm exec playwright install --with-deps chromium webkit` | WebKit covers iOS Safari behaviour                                                                         |

## First run (commands available after Phase 0 task P0-01/P0-03)

```bash
pnpm install
cp .env.example .env.local          # then fill values printed by the next command
pnpm db:start                       # supabase start (Docker): Postgres 17, Auth, Realtime, Storage, Studio, Mailpit
pnpm db:reset                       # apply migrations + seed demo café + process seed photos
pnpm dev                            # http://localhost:3000
```

Demo entry points (seeded by `supabase/seed.sql`, printed by `pnpm db:reset` or `pnpm demo:info`):

- Back-office: `http://localhost:3000/login`. Local password for every demo account: `Tawla-demo-2026`.
  - `owner@demo.tawla.local` (owner) and `manager@demo.tawla.local` (manager) of **Café El Bahja**;
  - `counter@demo.tawla.local` (counter: refused by the back-office, used by the staff screen);
  - `owner@pizzeria.tawla.local`, owner of **Pizzeria Test**, the second tenant for isolation checks.
- Public menus (from P1-07): `http://localhost:3000/cafe-el-bahja`, `http://localhost:3000/pizzeria-test`.
- Customer table menu: `http://localhost:3000/t/<demo-token>` (tables seeded in P1-08).
- Staff screen: pair from back-office → Devices.
- Supabase Studio: `http://localhost:54323` · Mailpit (auth emails): `http://localhost:54324`.

## Scripts (defined in P0-01 and later tasks)

| Script                                   | Does                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                               | Next dev (Turbopack) + service-worker watch build                                        |
| `pnpm build` / `pnpm start`              | Production build / serve                                                                 |
| `pnpm typecheck`                         | `tsc --noEmit`                                                                           |
| `pnpm lint` / `pnpm format`              | ESLint / Prettier                                                                        |
| `pnpm test`                              | Vitest unit + component (+ coverage with `--coverage`)                                   |
| `pnpm test:integration`                  | Vitest against local Supabase (RLS via Drizzle, realtime authorization)                  |
| `pnpm test:db`                           | pgTAP (`supabase test db`)                                                               |
| `pnpm test:e2e`                          | Playwright journeys + a11y                                                               |
| `pnpm test:visual`                       | Playwright screenshot matrix (widths × theme × locale)                                   |
| `pnpm screenshots <route>`               | Capture 390/768/1440 × light/dark × FR/AR for a route into `e2e/__screenshots__/review/` |
| `pnpm demo:info`                         | Print the demo URLs and local accounts                                                   |
| `pnpm db:start` / `db:stop` / `db:reset` | Supabase local lifecycle                                                                 |
| `pnpm db:new <name>`                     | New SQL migration                                                                        |
| `pnpm db:pull`                           | Regenerate Drizzle schema from the local DB (commit the result)                          |
| `pnpm size`                              | size-limit bundle budgets                                                                |
| `pnpm check:rls`                         | Fail if any table lacks RLS or tests                                                     |

## Environment variables (`.env.example`)

| Variable                                                               | Scope                               | Local value                                                                     |
| ---------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                                                  | public                              | `http://localhost:3000`                                                         |
| `NEXT_PUBLIC_APP_NAME` / `APP_DOMAIN`                                  | public / server                     | `Tawla` / `localhost:3000`                                                      |
| `NEXT_PUBLIC_SUPABASE_URL`                                             | public                              | from `supabase status`                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                 | public                              | from `supabase status`                                                          |
| `SUPABASE_SECRET_KEY`                                                  | server, **`src/server/admin` only** | from `supabase status`                                                          |
| `DATABASE_URL`                                                         | server                              | local Postgres (pooler URL in hosted envs, `prepare: false`)                    |
| `DATABASE_URL_DIRECT`                                                  | CI/migrations                       | direct connection                                                               |
| `CLIENT_SESSION_SECRET`                                                | server                              | random 32 bytes (jose HS256 for `__Host-tawla_cs`)                              |
| `PIN_PEPPER`                                                           | server                              | random 32 bytes                                                                 |
| `STAFF_EMAIL_DOMAIN`                                                   | server                              | `staff.tawla.local` locally; owned subdomain in hosted envs                     |
| `CRON_SECRET`                                                          | server + Supabase Vault             | random 32 bytes                                                                 |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`                                   | server                              | random 32 bytes base64                                                          |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN`                                    | server                              | empty locally → in-memory limiter adapter (same interface)                      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | public / server                     | `pnpm dlx web-push generate-vapid-keys`                                         |
| `ANTHROPIC_API_KEY`                                                    | server                              | developer's own key, low spend limit; AI tests use recorded fixtures by default |
| `AI_MODEL_EXTRACT` / `AI_MODEL_TRANSLATE`                              | server                              | `claude-sonnet-5-5` / `claude-haiku-5-5`                                        |
| `RESEND_API_KEY` / `EMAIL_FROM`                                        | server                              | empty locally → emails logged to console / Mailpit                              |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`              | public / server                     | Cloudflare test keys                                                            |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`            | server / public / CI                | empty locally (disabled)                                                        |
| `POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`               | server / public                     | empty locally (disabled)                                                        |

All variables are validated at boot by `src/lib/env.ts`. A missing required server variable fails fast with a clear message.

## Design review captures

`pnpm screenshots <route> [--as owner|manager|counter|pizzeriaOwner|none] [--base <url>]` needs the app running (`pnpm dev`, or `pnpm build && pnpm start`). `/dashboard` and `/admin` routes sign in as the demo owner by default. It writes 12 images plus `report.md` / `report.json` to `e2e/__screenshots__/review/<route>/` (git-ignored) and exits with 1 when a layout, target-size, axe or console check fails at any of the 7 widths.

In Git Bash, prefix with `MSYS_NO_PATHCONV=1` so `/dashboard` is not rewritten into a Windows path.

## Auth emails

- **Local:** Supabase sends confirmation and recovery emails to Mailpit (`http://localhost:54324`) using `supabase/templates/*.html` (FR/AR/EN from the `locale` user metadata). Restart Supabase after editing a template.
- **Hosted projects:** paste the same templates in Authentication → Email Templates (Confirm signup, Reset password), and add `https://<app-domain>/signup/confirm` and `https://<app-domain>/reset/confirm` to the redirect allow list. The links carry `token_hash`; our pages exchange it only when the user clicks (ADR-0010 amendment 2026-10-13).

## Windows notes

- Use Git Bash or PowerShell. Scripts are cross-platform (no bash-only syntax in `package.json`).
- `.gitattributes` enforces LF line endings.
- Supabase local reaches the Next dev server for cron callbacks at `http://host.docker.internal:3000`.

## Operations (filled in at the end of Phase 1)

Backups and monthly restore test, migration rollout, key rotation (PIN pepper, VAPID, cron secret), incident checklist.
