# 11 — Quality: performance, i18n, SEO, code standards, tests, CI/CD, monitoring

> Domain spec. Source: original spec §14, §15, §19.3–19.4, amended by ADR-0002, 0003, 0017, 0020, 0024, 0026, 0027. ADRs win on conflict.

No code reaches production without strict typing, lint, tests and review.

## Performance targets

| Metric                     | Target                                                       | Page                   | Enforced by                                                       |
| -------------------------- | ------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------- |
| LCP                        | < 2.0 s on 4G, entry-level phone                             | Customer menu          | Lighthouse CI (simulated mobile 4G) on preview                    |
| INP                        | < 200 ms                                                     | All                    | Lighthouse CI + field (Vercel Speed Insights on back-office only) |
| CLS                        | < 0.05                                                       | All                    | Lighthouse CI                                                     |
| Initial JS (gz)            | **< 150 KB** customer menu; 250 KB staff; 350 KB back-office | —                      | size-limit in CI                                                  |
| Product image              | < 80 KB (AVIF/WebP 640 w)                                    | Customer menu          | Processing pipeline (ADR-0018)                                    |
| Lighthouse mobile          | ≥ 90 in every category                                       | Customer menu, landing | Lighthouse CI                                                     |
| Order → staff notification | < 2 s p95                                                    | Realtime               | Ack metrics (ADR-0007)                                            |

How:

- RSC + `'use cache'` with tags and on-demand revalidation;
- client islands only; lazy Realtime, search and Motion features;
- self-hosted subset fonts with `swap`;
- pre-generated responsive images with thumbhash;
- service worker for instant reload and offline viewing;
- optimistic UI in the staff app.

## Internationalisation (ADR-0026)

- FR (default), AR (MSA, RTL), EN via next-intl. Messages per locale and surface in `src/messages/`. Typed keys; CI fails on missing keys.
- Logical CSS properties only; directional icons mirrored.
- Menu content fallback: requested → restaurant default → first available.
- Dates, times and money through `Intl` / `formatMoney` with `Africa/Tunis`, Latin digits.

## SEO and sharing

- `/{slug}` public menus are indexable (option to disable), with Schema.org `Restaurant` + `Menu` JSON-LD. `/t/*` is `noindex`.
- Open Graph images (logo + cover) for WhatsApp and Instagram sharing.
- Landing optimised for local searches ("menu QR code Tunisie", "menu digital café").

## Code standards

- TypeScript **strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). **No `any`.** No dead code. No TODO without a tracked issue reference (`TODO(#12): …`, lint rule).
- ESLint (flat config) + Prettier, run on commit through husky + lint-staged. Commit messages checked by commitlint (Conventional Commits).
- Feature-based architecture with enforced import boundaries (07-architecture).
- Pure business logic in `services/`, with no React, Next or DB imports.
- **Naming:**
  - components `PascalCase`;
  - functions and variables `camelCase`;
  - files `kebab-case`;
  - DB `snake_case`;
  - Zod schemas `xxxSchema`, inferred types `Xxx`.
- **Non-negotiables** (also in CLAUDE.md):
  - integer millimes;
  - `restaurant_id` + RLS + tests on every table;
  - Zod on every input;
  - server-side total recomputation;
  - UI strings only in `messages/`;
  - mobile-first;
  - tokens only.

## Test strategy

| Level         | Tool                                                  | Scope                                                                                                                                                | Target                                                                                       |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit          | Vitest                                                | Pricing and options, state machine, permissions, money formatting, schedules, business day, brand contrast, recipients routing, search normalisation | **≥ 90 % coverage on `services/`** (CI threshold); state machine, pricing, permissions 100 % |
| Component     | Vitest + Testing Library                              | Product card, product sheet, cart, request card, order card                                                                                          | Critical components                                                                          |
| Database      | pgTAP (`supabase test db`) + Vitest through `withRls` | RLS isolation between tenants and roles, triggers, functions (uuid_v7, business_date, get_public_menu)                                               | **100 % of tables** (CI check)                                                               |
| Realtime      | Vitest integration on local Supabase                  | Channel authorization per topic and role, anon receive-only                                                                                          | Every topic                                                                                  |
| E2E           | Playwright                                            | Scan → menu → call waiter → staff receives (P1); scan → cart → order → counter → served (P2); onboarding                                             | Critical journeys, mobile + tablet                                                           |
| Visual        | Playwright screenshots                                | 390 / 768 / 1440 × light/dark × FR/AR baselines; layout checks (no h-scroll, no overflow, target sizes) at all 7 widths                              | Every screen                                                                                 |
| Accessibility | axe-core in Playwright                                | Customer, staff, back-office pages                                                                                                                   | Zero serious or critical                                                                     |
| Load          | k6                                                    | 200 concurrent orders, 2,000 menu views per minute                                                                                                   | p95 < 500 ms (Phase 2)                                                                       |

## CI/CD (ADR-0024)

1. **PR → GitHub Actions `ci.yml`:**
   - install (pnpm, cached) → `typecheck` → `lint` → `test` (unit + coverage);
   - start Supabase local → `db:reset` → `test:db` (pgTAP) → `test:integration` (RLS via Drizzle, realtime);
   - RLS coverage check → `db:pull` drift check → `build` → `size-limit`.
2. **PR → `e2e.yml`:** build + start app against local Supabase → Playwright (journeys, a11y, visual) → upload report and screenshots as artifacts.
3. **Vercel preview** per PR → Lighthouse CI on `/t/{demo}` and `/`.
4. **Merge to `main`:** migrations pushed to staging, then staging deploy.
5. **Tag `v*`:** manual approval → migrations to production → production deploy.

Migrations are versioned and never applied by hand in production. Destructive changes use expand/contract.

## Environments

Local (Docker Supabase + seed) · CI (local Supabase in job) · Preview (Vercel + staging DB, smoke only) · Staging (`main`) · Production (tags). See ADR-0024.

## Monitoring (ADR-0020)

- Sentry (server everywhere; lazy minimal client on the customer menu; full client elsewhere). Alerts by email or Telegram on new issues.
- PostHog funnel (scan → add to cart → order) from server events; cookieless client analytics on back-office and marketing.
- Uptime probe every minute on the menu and `/api/health`; public status page.
- Structured JSON logs with `request_id` and `restaurant_id`.
- Availability objective: 99.9 % during venue opening hours.
- Notification latency p95 and incidents on the admin dashboard.

## Definition of Done (every task)

- [ ] Types pass (`pnpm typecheck`), lint passes (`pnpm lint`).
- [ ] Tests written and green (unit, DB, E2E as relevant); coverage thresholds hold.
- [ ] Screens verified by Playwright screenshots at 390 / 768 / 1440 in light/dark and FR/AR. Layout checks pass at all 7 widths. Screenshots reviewed critically and every issue fixed.
- [ ] No console errors or warnings in E2E runs.
- [ ] axe: zero serious or critical violations; keyboard path checked.
- [ ] Bundle budget and Lighthouse thresholds hold (when the task touches those pages).
- [ ] `CLAUDE.md`, `docs/spec/*` and ADRs updated when a rule or decision changed.
- [ ] Conventional Commit(s); PR description lists what to check.

## MVP acceptance criteria (amended)

- [ ] A manager creates an account, imports the menu (AI photo) and prints QR tents in < 30 min.
- [ ] Menu displays in < 2 s on 4G on an entry-level phone (LCP).
- [ ] Menu works in FR, AR (RTL) and EN, light and dark, **with and without photos**.
- [ ] A product marked unavailable appears greyed for customers within 5 s.
- [ ] A regenerated QR makes the old one unusable immediately.
- [ ] A waiter call reaches the staff screen within 2 s (p95) with the right table, with sound (Phase 1).
- [ ] (Pro) An order reaches the counter and the zone waiter within 2 s (p95) with the right table.
- [ ] (Pro) The customer sees every status change without reloading.
- [ ] (Pro) A double tap on "Send" creates only one order.
- [ ] (Pro) A price changed in the browser is ignored; the stored total is the DB one.
- [ ] A user of one venue can access no data of another (RLS tests green, including Realtime).
- [ ] Lighthouse mobile ≥ 90 and zero serious accessibility violations on the customer menu.
