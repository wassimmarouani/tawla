# Local environment setup

Target: any developer (or Claude Code session) goes from clone to a running demo café in < 15 minutes. **Never use production credentials locally.**

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 LTS (`.nvmrc`) | |
| corepack | **0.36.0** | Node 24.11 ships corepack 0.34, which can't run pnpm 12. `npm i -g corepack@0.36.0` |
| pnpm | 12.7.0 (pinned via `packageManager`) | `corepack enable pnpm` (Windows without admin: `corepack enable pnpm --install-directory "%APPDATA%\npm"`) |
| Docker | Docker Desktop running | Required by Supabase local |
| Supabase CLI | pinned devDependency `supabase` | Run through `pnpm supabase …` (no global install) |
| Git | ≥ 2.39 | |
| Playwright browsers | installed by `pnpm exec playwright install --with-deps chromium webkit` | WebKit covers iOS Safari behaviour |

## First run (commands available after Phase 0 task P0-01/P0-03)

```bash
pnpm install
cp .env.example .env.local          # then fill values printed by the next command
pnpm db:start                       # supabase start (Docker): Postgres 17, Auth, Realtime, Storage, Studio, Mailpit
pnpm db:reset                       # apply migrations + seed demo café + process seed photos
pnpm dev                            # http://localhost:3000
```

Demo entry points (seeded):
- Customer table menu: `http://localhost:3000/t/<demo-token>`, printed by `pnpm db:reset`.
- Public menu: `http://localhost:3000/cafe-el-bahja`.
- Back-office: `owner@demo.tawla.local` / password printed by the seed (local only).
- Staff screen: pair from back-office → Devices.
- Supabase Studio: `http://localhost:54323` · Mailpit (auth emails): `http://localhost:54324`.

## Scripts (defined in P0-01 and later tasks)

| Script | Does |
|---|---|
| `pnpm dev` | Next dev (Turbopack) + service-worker watch build |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm test` | Vitest unit + component (+ coverage with `--coverage`) |
| `pnpm test:integration` | Vitest against local Supabase (RLS via Drizzle, realtime authorization) |
| `pnpm test:db` | pgTAP (`supabase test db`) |
| `pnpm test:e2e` | Playwright journeys + a11y |
| `pnpm test:visual` | Playwright screenshot matrix (widths × theme × locale) |
| `pnpm screenshots <route>` | Capture 390/768/1440 × light/dark × FR/AR for a route into `e2e/__screenshots__/review/` |
| `pnpm db:start` / `db:stop` / `db:reset` | Supabase local lifecycle |
| `pnpm db:new <name>` | New SQL migration |
| `pnpm db:pull` | Regenerate Drizzle schema from the local DB (commit the result) |
| `pnpm size` | size-limit bundle budgets |
| `pnpm check:rls` | Fail if any table lacks RLS or tests |

## Environment variables (`.env.example`)

| Variable | Scope | Local value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` / `APP_DOMAIN` | public / server | `Tawla` / `localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | public | from `supabase status` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | from `supabase status` |
| `SUPABASE_SECRET_KEY` | server, **`src/server/admin` only** | from `supabase status` |
| `DATABASE_URL` | server | local Postgres (pooler URL in hosted envs, `prepare: false`) |
| `DATABASE_URL_DIRECT` | CI/migrations | direct connection |
| `CLIENT_SESSION_SECRET` | server | random 32 bytes (jose HS256 for `__Host-tawla_cs`) |
| `PIN_PEPPER` | server | random 32 bytes |
| `STAFF_EMAIL_DOMAIN` | server | `staff.tawla.local` locally; owned subdomain in hosted envs |
| `CRON_SECRET` | server + Supabase Vault | random 32 bytes |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | server | random 32 bytes base64 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | server | empty locally → in-memory limiter adapter (same interface) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | public / server | `pnpm dlx web-push generate-vapid-keys` |
| `ANTHROPIC_API_KEY` | server | developer's own key, low spend limit; AI tests use recorded fixtures by default |
| `AI_MODEL_EXTRACT` / `AI_MODEL_TRANSLATE` | server | `claude-sonnet-5-5` / `claude-haiku-5-5` |
| `RESEND_API_KEY` / `EMAIL_FROM` | server | empty locally → emails logged to console / Mailpit |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | public / server | Cloudflare test keys |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | server / public / CI | empty locally (disabled) |
| `POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST` | server / public | empty locally (disabled) |

All variables are validated at boot by `src/lib/env.ts`. A missing required server variable fails fast with a clear message.

## Windows notes
- Use Git Bash or PowerShell. Scripts are cross-platform (no bash-only syntax in `package.json`).
- `.gitattributes` enforces LF line endings.
- Supabase local reaches the Next dev server for cron callbacks at `http://host.docker.internal:3000`.

## Operations (filled in at the end of Phase 1)
Backups and monthly restore test, migration rollout, key rotation (PIN pepper, VAPID, cron secret), incident checklist.
