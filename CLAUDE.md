# CLAUDE.md — Tawla

Rules for every Claude Code session in this repo. Read this file fully, then only the docs your task needs (`docs/README.md` maps tasks to files).

## Product (10 lines)

1. **Tawla** (working name; `APP_NAME`/`APP_DOMAIN` constants) is a multi-tenant SaaS for Tunisian cafés and restaurants.
2. Customers scan a QR on their table (`/t/{token}`) and get a fast digital menu in FR / AR (RTL) / EN, with no app and no account.
3. **Basic:** menu, branding, out-of-stock toggle, "call waiter" / "request bill" with real-time staff alerts, AI menu import and AI translation (quota).
4. **Pro:** cart and table ordering, live order tracking, table bill, staff PIN login, zones, counter kanban.
5. **Premium:** bar/kitchen display, promotions, printing, multi-site, AI insights.
6. Staff use a PWA on paired devices (counter tablet, waiters' phones): sound, vibration, Web Push, Wake Lock, receipt acks.
7. Owners and managers use a back-office: guided onboarding (< 30 min to a published menu), menu editor with live preview, tables and QR tents, staff, settings, stats.
8. Super Admin console: tenants, plans, flags, billing, audit, impersonation (Support).
9. Prices are integer millimes. The server recomputes every total. Orders are idempotent. Notifications < 2 s p95, measured by acks.
10. Phase 1 = sellable Basic for 3 pilot cafés. Phase 2 = ordering. See `docs/plan/phase-0-1.md`.

## Source of truth

- **Precedence: `docs/adr/` > `docs/spec/` > `docs/cahier-des-charges.md`** (the original, historical; never implement from it).
- A decision that changes behaviour → new ADR + update the affected `docs/spec/*` in the **same commit**.
- Database: **SQL migrations in `supabase/migrations/` are the schema source of truth.** The Drizzle schema is introspected (`pnpm db:pull`), never hand-edited.

## Stack (pinned; see ADR-0002 for exact versions and why)

Next.js 16 (App Router, RSC, Cache Components, `proxy.ts`, Turbopack) · React 19.3 · TypeScript 6.0 strict · Tailwind CSS 4 (tokens in `@theme`) · shadcn/ui on **Base UI** · Motion 13 (`LazyMotion` + `m`) · next-intl 4 · Zod 4 · React Hook Form · Zustand (cart) · TanStack Query (staff/back-office only) · Supabase (Postgres 17, Auth, Realtime Broadcast, Storage, Cron) · Drizzle ORM (under `withRls`) · Upstash rate limiting · web-push · serwist core + esbuild SW · sharp + thumbhash · Anthropic SDK (`claude-sonnet-5-5` extraction, `claude-haiku-5-5` translation) · Vitest 5 · Playwright + axe · pnpm 12 (corepack 0.36) · Node 24 LTS · Vercel `cdg1` + Supabase `eu-west-3`.

Version policy: exact pins, ≥ 14 days old (`minimumReleaseAge`), security patches excepted.

## Commands

```bash
pnpm dev                 # app + SW watch
pnpm typecheck           # tsc --noEmit
pnpm lint                # eslint (next lint no longer exists)
pnpm test                # vitest unit/component (add --coverage)
pnpm test:integration    # vitest vs local Supabase (RLS, realtime)
pnpm test:db             # pgTAP
pnpm test:e2e            # playwright journeys + axe
pnpm test:visual         # screenshot matrix
pnpm screenshots <route> # 390/768/1440 × light/dark × fr/ar captures + layout report (app running)
pnpm demo:info           # demo URLs and local accounts (also printed by db:reset)
pnpm db:start | db:reset | db:new <name> | db:pull
pnpm size                # bundle budgets
pnpm tokens:build        # regenerate src/styles/tokens.css from tokens.ts
pnpm check:rls           # every table has RLS + tests
```

Environment: `docs/setup.md`. Local Supabase only. **Never use or request production credentials.**

## Non-negotiable rules

1. **Money = integer millimes** (`3500` = 3,500 DT). Never floats, never `toFixed` maths. Format only with `formatMoney(millimes, locale)`.
2. **Every tenant table has `restaurant_id not null`, composite FKs to its parent, RLS enabled, and RLS tests** (tenant A ≠ tenant B, per role, anon). No exceptions, including child tables. `pnpm check:rls` must pass.
3. **Every input is validated with Zod**: route handlers, Server Actions, env, AI outputs, jsonb columns. Schemas live in `features/*/schemas` and are shared client/server.
4. **The server recomputes totals** from DB prices with the pure pricing service. Client totals are display-only.
5. **All UI strings live in `src/messages/{fr,ar,en}/*.json`.** No hard-coded user-facing text, including aria-labels and alt fallbacks.
6. **Mobile-first, flawless at 360/390/430/768/1024/1280/1440.** No horizontal scroll, no overflow or truncation, no overlaps, targets ≥ 44 px (≥ 48 px staff), safe areas, `dvh`.
7. **Design tokens only.** Tokens live in `src/styles/tokens.ts` (`pnpm tokens:build` generates `tokens.css`; tests check AA contrast and freshness). No hex and no arbitrary Tailwind values in product code. Vendored primitives in `src/components/ui/` may use internal `calc()` geometry but **never a colour literal** (lint-enforced). **Logical properties only** (`ms-`, `pe-`, `start-`), never `ml-`/`pr-`/`left-`. Text fields use `dir="auto"` (Latin text typed in the Arabic UI).
8. **DB access:** user-scoped queries only through `withRls(claims, tx => …)`. The raw client and `SUPABASE_SECRET_KEY` are allowed only in `src/lib/db/**` and `src/server/admin/**` (lint-enforced). Privileged functions validate inputs and check preconditions explicitly.
9. **Business logic is pure, in `features/*/services/`**: no React, Next or DB imports, unit-tested (≥ 90 % coverage; state machine, pricing and permissions 100 %).
10. **Permissions checked three times:** UI (`can()`), server (`can()` + feature flag), DB (RLS). Flags are always checked server-side.
11. **Mutations:** staff/public → Route Handlers (`/api/staff|public/*`) with idempotency keys. Back-office forms → Server Actions. Errors → `{ code, message, details? }` with codes from `src/lib/errors/codes.ts`.
12. **Order transitions** go through `transition()` + conditional update (`where status = $from`). Never update `status` directly.
13. **Realtime:** private channels only. Clients never send; DB triggers publish via `realtime.send`. Clients refetch on (re)connect and ignore stale `version`s.
14. **Security:** secrets only in env. No `dangerouslySetInnerHTML`. GET handlers are side-effect free. Rate-limit public endpoints. Audit sensitive actions.
15. **Customer menu budget:** < 150 KB gz initial JS. No TanStack Query or Supabase client in its initial bundle; lazy-load realtime, search and Motion features.
16. **Accessibility:** WCAG 2.2 AA, keyboard paths, visible focus, never colour alone, `prefers-reduced-motion` respected.
17. **TypeScript strict:** no `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason only in tests), no dead code, no `TODO` without an issue reference: `TODO(#123): …`.
18. **No `console`** in `src/`: log through `src/lib/log.ts` (structured JSON). **No invisible or bidi control characters** in source (NBSP, isolates, marks): write them as Unicode escape sequences. Both lint-enforced.

## Naming

- Components `PascalCase` · functions and variables `camelCase` · files and folders `kebab-case` · DB `snake_case` (plural tables) · Zod schema `fooSchema` → type `Foo` · constants `SCREAMING_SNAKE`.
- Features: `src/features/<domain>/{components,server,services,schemas,queries,hooks,index.ts}`. Import other features only through `index.ts`.
- Migrations: `supabase/migrations/<timestamp>_<verb>_<object>.sql` (e.g. `…_create_menu_tables.sql`). pgTAP: `supabase/tests/<area>.test.sql`.
- Tests colocated: `foo.ts` ↔ `foo.test.ts`. E2E in `e2e/<surface>/<journey>.spec.ts`.

## Git and commits

- Trunk-based: `feat/<task-id>-short-name` / `fix/…` → PR → squash-merge to `main`. Production from tags `v*`.
- **Conventional Commits**: `feat(menu): add option group overrides`, `fix(rls): …`, `test(orders): …`, `docs(adr): …`, `chore(deps): …`, `refactor`, `perf`, `ci`, `build`. Scope = feature or area. Imperative, ≤ 72 characters subject.
- One task = small, reviewable commits. Never commit secrets, `.env*` (except `.env.example`), screenshots outside `e2e/__screenshots__/`.
- Never skip hooks (`--no-verify`).

## Working method (every task)

1. **Plan:** read the task in `docs/plan/`, the relevant spec and ADRs. State files, schemas, migrations and tests before writing code.
2. **Implement** in small steps, tests with or before the logic.
3. **Verify:** typecheck, lint, tests; for screens, `pnpm screenshots` and review them critically as a design lead (hierarchy, spacing, alignment, RTL mirroring, dark mode contrast, truncation, empty/loading/error/offline states). Fix everything found.
4. **Self-review the diff** against these rules.
5. **Summarise:** what changed, what to check, follow-ups. Commit.
6. If a trade-off or ambiguity appears, **state it and ask**. Never cut corners silently.

## Definition of Done

- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] Tests written and green (unit / DB / integration / E2E as relevant); coverage thresholds hold.
- [ ] Screens: screenshots at 390 / 768 / 1440 × light/dark × FR/AR reviewed and fixed; layout checks pass at all 7 widths; no console errors.
- [ ] axe: zero serious or critical; keyboard navigation works; focus visible.
- [ ] Bundle budget and Lighthouse thresholds hold for touched pages.
- [ ] `CLAUDE.md`, `docs/spec/*`, ADRs updated if a rule or decision changed.
- [ ] Conventional Commit(s); summary of what to check.
