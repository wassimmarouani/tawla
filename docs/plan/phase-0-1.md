# Implementation plan — Phase 0 (Foundations) and Phase 1 (MVP Menu, Basic sellable)

> Status: **Proposed, awaiting owner approval.** Each task follows the CLAUDE.md working method and Definition of Done: plan → implement → tests → screenshots (UI) → self-review → summary → Conventional Commit(s) on a `feat/<id>-…` branch.
> Size: **S** ≤ ½ day · **M** ≈ 1 day · **L** ≈ 2 days (solo dev + Claude Code). ⛔ = stop point for the owner. 👤 = owner action needed.

## Overview

| ID                                      | Task                                                                            | Size | Depends on          |
| --------------------------------------- | ------------------------------------------------------------------------------- | ---- | ------------------- |
| **Phase 0 — Foundations (≈ 9–11 days)** |                                                                                 |      |
| P0-01                                   | Repository scaffold and toolchain                                               | M    | —                   |
| P0-02                                   | CI pipeline and repo hygiene 👤 remote URL                                      | S    | P0-01               |
| P0-03                                   | Supabase local + foundation schema + RLS + pgTAP                                | L    | P0-01               |
| P0-04                                   | Data access layer (`withRls`, admin module, isolation tests)                    | M    | P0-03               |
| P0-05                                   | Core pure libraries (money, errors, permissions, flags, schedule, business day) | M    | P0-01               |
| P0-06                                   | ⛔ Three visual directions on the customer menu screen                          | L    | P0-01, P0-05        |
| P0-07                                   | Design system foundation (tokens, brand theming, fonts, components, states)     | L    | P0-06 choice        |
| P0-08                                   | Spike: Realtime private channels and anon receive-only                          | S    | P0-03               |
| P0-09                                   | Spike: shadow-user session minting                                              | S    | P0-03               |
| P0-10                                   | i18n, routing and `proxy.ts`                                                    | M    | P0-05               |
| P0-11                                   | Owner/manager authentication and tenant context                                 | M    | P0-04, P0-10, P0-07 |
| P0-12                                   | Demo café seed (core) and screenshot tooling                                    | M    | P0-03, P0-07        |
| **Phase 1 — MVP Menu (≈ 22–26 days)**   |                                                                                 |      |
| P1-01                                   | Menu schema, `get_public_menu()`, menu seed                                     | L    | P0-04, P0-12        |
| P1-02                                   | Menu pure services (pricing, options, rounding, fallback, search)               | M    | P0-05               |
| P1-03                                   | Media pipeline (renditions, thumbhash, `<MenuImage>`)                           | M    | P1-01               |
| P1-04                                   | Back-office shell (layout, navigation, Cmd+K, checklist)                        | M    | P0-11               |
| P1-05                                   | Menu editor: categories and products                                            | L    | P1-01..04           |
| P1-06                                   | Menu editor: option groups, attributes, live preview                            | L    | P1-05, P1-07a       |
| P1-07a                                  | Customer menu: page, data, header, category bar, adaptive layout                | L    | P1-01..03, P0-10    |
| P1-07b                                  | Customer menu: product sheet, search, filters, SEO                              | M    | P1-07a              |
| P1-08                                   | Tables, zones, QR tokens, print tents                                           | M    | P1-01               |
| P1-09                                   | Sessions and service requests backend, rate limits, realtime triggers, cron     | L    | P1-08, P0-08        |
| P1-10                                   | Customer service-request UI, feedback, live availability                        | M    | P1-09, P1-07b       |
| P1-11                                   | Device pairing, staff accounts (Basic), push plumbing, SW build                 | M    | P1-09, P0-11        |
| P1-12                                   | Staff live screen (Start service, requests, availability, acks, push)           | L    | P1-11               |
| P1-13                                   | AI menu import and translation (quotas, usage, evals) 👤 API key                | L    | P1-05               |
| P1-14                                   | Onboarding wizard and settings                                                  | L    | P1-05, P1-08, P1-13 |
| P1-15                                   | Minimal Super Admin (platform roles, TOTP, plans, flags, AI usage)              | M    | P0-11               |
| P1-16                                   | Landing, pricing, legal placeholders                                            | M    | P0-07, P0-10        |
| P1-17                                   | Production readiness and pilot launch 👤 accounts                               | L    | all                 |

---

## Phase 0 — Foundations

### P0-01 — Repository scaffold and toolchain · M

**Deliverables**

- Next.js 16 (App Router, `src/`, Turbopack, `cacheComponents: true`), React 19.3, TypeScript 6.0.3 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind 4.
- Exact pins per ADR-0002 (patched Next 16.x if the 2026-10-14 security release is out); `pnpm-workspace.yaml` with `minimumReleaseAge: 20160`; `.nvmrc`, `.gitattributes` (LF), `.gitignore`, `.env.example`.
- `src/lib/env.ts` (@t3-oss/env-nextjs): fail-fast validation.
- ESLint flat config:
  - next + typescript-eslint strict-type-checked;
  - boundaries plugin (import rules from 07-architecture);
  - `no-restricted-imports` for the raw DB client and secret key;
  - bans on `dangerouslySetInnerHTML`, physical direction classes, arbitrary Tailwind values outside `tokens.css`, `TODO` without an issue ref.
- Prettier + tailwind plugin; husky + lint-staged + commitlint.
- Vitest config (jsdom + node projects, coverage thresholds on `services/`); Playwright config with projects for 360/390/430/768/1024/1280/1440 and Chromium + WebKit.
- `scripts/check-versions.mjs`; `README.md` quick start.

**Acceptance criteria**

- `pnpm dev` serves a placeholder page; `pnpm typecheck`, `pnpm lint`, `pnpm test` (one sample test) and `pnpm build` pass.
- A commit message `bad message` is rejected by commitlint; `feat(repo): scaffold` passes.
- Fixture files prove each custom lint rule fires: `ml-4`, `text-[13px]`, raw DB import in a feature, `dangerouslySetInnerHTML`, `TODO` without a ref. The fixtures are excluded from the real lint run.
- No dependency younger than 14 days except a documented security release.

### P0-02 — CI pipeline and repo hygiene · S · 👤 GitHub remote URL

**Deliverables**

- `.github/workflows/ci.yml`: install with cache → typecheck → lint → unit tests + coverage → build → size-limit. DB jobs are added in P0-03.
- `.github/workflows/e2e.yml` (skeleton, enabled when the first screen exists).
- `dependabot.yml` (weekly, grouped); `pull_request_template.md` with the DoD checklist.
- Branch protection recommendations documented for the owner.

**Acceptance criteria**

- Workflows pass `actionlint`.
- First push to the private remote → CI green on `main` and on a test PR.
- **I'll ask for the remote URL at the start of this task.**

### P0-03 — Supabase local, foundation schema, RLS, pgTAP · L

**Deliverables**

- `supabase/config.toml`: PG 17, Auth settings (password ≥ 10, email confirmations via Mailpit), Realtime public access off.
- Migration `…_foundation.sql`:
  - extensions; `uuid_v7()`; `set_updated_at()` trigger; enums (`platform_role`, `membership_role`, `restaurant_status`, `subscription_status`);
  - tables `organizations`, `profiles` (+ auto-create on signup trigger), `restaurants`, `slug_redirects`, `reserved_slugs` (seeded), `memberships`, `plans` (seeded Basic / Pro / Premium with features, limits, AI caps), `subscriptions`, `feature_overrides`, `audit_logs`;
  - composite FKs; RLS policies; helper SQL functions (`auth_has_role(restaurant_id, roles[])` reading JWT claims, `is_platform_admin()` with `aal2`).
- **Custom Access Token Hook** (SQL) adding `memberships[]` claims.
- pgTAP tests `supabase/tests/*.test.sql`:
  - RLS enabled on every table;
  - tenant A/B isolation for each table and role;
  - anon sees nothing;
  - platform admin requires `aal2`;
  - `uuid_v7` version/variant/ordering;
  - reserved slug rejection.
- `scripts/check-rls-coverage.ts` (`pnpm check:rls`): every `public` table has RLS on **and** is referenced by at least one test.
- CI job: start Supabase → `db:reset` → `test:db` → `check:rls`.

**Acceptance criteria**

- `pnpm db:reset` succeeds on a clean machine (Windows + CI Linux). All pgTAP tests are green.
- Adding a table without RLS, or without a test, makes `check:rls` fail (proved by a temporary fixture migration in the test suite).
- JWT of a seeded manager contains the right `memberships` claim (integration test).

### P0-04 — Data access layer · M

**Deliverables**

- `drizzle.config.ts`; `pnpm db:pull` generating `src/lib/db/schema/`.
- `src/lib/db/client.ts` (postgres.js, `prepare: false`); `src/lib/db/rls.ts` (`withRls(claims, fn)` per Drizzle's official pattern, including `finally` reset).
- `src/server/admin/` skeleton (`server-only`, privileged client, audit helper).
- `src/lib/supabase/{server,browser}.ts` (@supabase/ssr, publishable key).
- CI drift check (`db:pull && git diff --exit-code`).

**Acceptance criteria**

- Vitest integration suite on local Supabase:
  - via `withRls`, tenant A's manager reads only A's rows for every foundation table;
  - an unauthenticated call sees nothing;
  - a write into B is rejected;
  - claims don't leak between consecutive transactions on the same pooled connection.
- Importing `@/lib/db/client` from `src/features/**` fails lint.

### P0-05 — Core pure libraries · M

**Deliverables** (each with exhaustive unit tests)

- `lib/money`: `formatMoney`, `parseMoneyInput`, integer helpers (ADR-0026 table + edge cases).
- `lib/errors`: codes + `AppError` + HTTP mapping.
- `features/auth/services/permissions.ts`: `can()` covering the **full matrix** in 01-roles-permissions (table-driven test, 100 %).
- `lib/flags`: `isEnabled()` (override ?? plan default AND restaurant setting, expiry).
- `features/tenancy/services/business-day.ts` + shared test vectors (also used by pgTAP later).
- `lib/schedule`: `Schedule` Zod schema, `isOpenAt()` incl. overnight ranges, exceptions, manual status, DST-free Africa/Tunis.
- `lib/log.ts`.

**Acceptance criteria**

- 100 % coverage on permissions, money, schedule and business day. All tests green.
- No React, Next or DB imports in these modules (boundaries lint).

### P0-06 — ⛔ Three visual directions · L

**Deliverables**

- A dev-only route `/dev/directions/[id]` rendering **the same customer menu screen** (header with cover and logo, "Table 9" badge, category bar, a photo category and a photo-less category, product cards, floating service buttons) from static fixtures of a realistic Tunisian café menu (FR/AR names, millime prices).
- Three directions, each with:
  - a palette (neutrals + accent);
  - a typography pairing (Inter or Geist × IBM Plex Sans Arabic or Cairo);
  - a component style (radii, density, elevation, imagery treatment, badge style).
- Screenshots at **390 px** for each direction: light/dark × FR/AR × with photos / without photos × 2 tenant brand colours (one light, e.g. saffron; one dark, e.g. deep olive) → 16 images per direction. Collected in `docs/design/directions/` with a one-page comparison (rationale, strengths, risks per direction).
- Automated checks on each capture: AA contrast of text and brand-on-surface, no horizontal overflow.

**Acceptance criteria**

- 48 screenshots plus the comparison sheet delivered. All captures pass contrast and overflow checks.
- **STOP:** the owner picks a direction (or a mix). I record **ADR-0029** and update `docs/spec/10-design-system.md`.

### P0-07 — Design system foundation · L

**Deliverables**

- `src/styles/tokens.css`: full token set (10-design-system) for the chosen direction, light and dark.
- `lib/theme/brand.ts`: `generateBrandScale`, `pickAccessible`, CSS variable injection; **property-based tests** (random colours always meet AA).
- Fonts self-hosted and subset (Latin, Arabic), preload strategy, metric-matched fallbacks. next-themes provider.
- shadcn initialised with Base UI. Restyled components: Button, IconButton, Input, Textarea, Select, Switch, Checkbox, RadioGroup, Badge, Card, Dialog, **Sheet** (bottom sheet per ADR-0021: drag to close, snap points, safe area, reduced motion), Tabs, Tooltip, DropdownMenu, Command, Toast (sonner), Skeleton, Avatar, Separator.
- `components/states`: Empty, Error, Offline, Loading (skeleton patterns); `components/layout` primitives.
- Dev gallery `/dev/design-system` with every component and state in both themes and both directions (LTR/RTL).

**Acceptance criteria**

- Gallery screenshots at 390 / 768 / 1440 × light/dark × FR/AR are reviewed and issues fixed.
- axe: zero serious or critical. Keyboard: every component operable, focus visible.
- Sheet: drag-to-close works on touch emulation, Back closes it, reduced motion replaces the slide with a fade.
- Lint passes with zero arbitrary values outside `tokens.css`.

### P0-08 — Spike: Realtime authorization · S

**Deliverables**

- Throw-away migration + Vitest integration tests on local Supabase, proving or disproving ADR-0008:
  - anon receives on private `m:` / `s:` topics;
  - anon cannot send;
  - a waiter of zone 1 can't join zone 2;
  - tenant B can't join tenant A topics;
  - a `realtime.send` from a trigger reaches subscribers.
- Measured publish → receive latency locally.

**Acceptance criteria**

- Report appended to ADR-0008 (status → Accepted-verified, or the fallback activated with a superseding ADR). The tests are kept as the permanent realtime authorization suite.

### P0-09 — Spike: shadow-user session minting · S

**Deliverables**

- Integration test:
  - `admin.createUser` (synthetic email) → `generateLink` → `verifyOtp(type 'email')` → session has the hook claims → RLS works with it;
  - the same `token_hash` reused → must fail (otherwise implement used-token tracking);
  - revoking the session invalidates refresh.

**Acceptance criteria**

- Report appended to ADR-0010; fallback (own signing key) documented if needed.

### P0-10 — i18n, routing, `proxy.ts` · M

**Deliverables**

- next-intl: `src/i18n/routing.ts` (marketing as-needed), `request.ts` (locale from `[locale]` segment, else cookie / profile / restaurant resolution).
- Message files per surface for fr/ar/en with typed keys, plus a CI script for missing or extra keys.
- `src/proxy.ts`: locale handling for marketing, reserved segments pass-through, `/{slug}` → `/r/{slug}` rewrite, auth cookie refresh for app routes, security headers (CSP per surface per ADR-0017).
- `<html lang dir>` handling. RTL utilities (directional icon mirroring).

**Acceptance criteria**

- Unit tests for the proxy routing decision function (every segment class, reserved slugs, locales).
- Playwright:
  - `/`, `/ar`, `/en/pricing` resolve the right locale;
  - `/cafe-el-bahja` renders through the rewrite;
  - `/dashboard` is unprefixed;
  - `dir="rtl"` on Arabic.
- Headers present and correct per surface (test).

### P0-11 — Owner/manager authentication and tenant context · M

**Deliverables**

- Pages: sign up, log in, log out, forgot/reset password, email verification (Mailpit locally).
- Sign-up → `src/server/admin/onboarding.ts` creates organization + restaurant (slug checked against reserved list) + owner membership + Basic subscription in one transaction. Audited.
- Protected `/dashboard` layout: `getTenantContext()` (restaurant, role, flags), cached per request; restaurant switcher when the user has several; 403 and empty states.

**Acceptance criteria**

- E2E: sign up → verify email → land on an empty dashboard with the right restaurant; log out → protected routes redirect to login.
- Integration: a user of restaurant A can't load B's dashboard (403 + RLS).
- Screens pass the DoD (screenshots, axe, both themes, FR/AR).

### P0-12 — Demo café seed (core) and screenshot tooling · M

**Deliverables**

- `supabase/seed.sql`: **Café El Bahja** (Tunis), owner, manager, 1 staff account, Basic + override for demo features, schedule with an overnight Saturday. Second tenant **Pizzeria Test** for isolation tests. The menu seed is added in P1-01.
- `scripts/screenshots.ts` (`pnpm screenshots <route>`): captures 390/768/1440 × light/dark × fr/ar, plus layout assertions (no horizontal scroll, no element overflow, target sizes ≥ 44/48 px) at all 7 widths. Report in `e2e/__screenshots__/review/`.
- `pnpm db:reset` prints demo URLs and local credentials.

**Acceptance criteria**

- Fresh clone → `db:reset` → demo login works.
- Screenshot script runs on `/dashboard` and produces 12 images + a pass/fail layout report.

**Phase 0 exit:** CI green on `main`; foundation schema with RLS tests; data layer; design system from the chosen direction; auth; seed; both spikes resolved.

---

## Phase 1 — MVP Menu (Basic sellable)

### P1-01 — Menu schema, `get_public_menu()`, menu seed · L

**Deliverables**

- Migration: `media`, `categories`, `products`, `option_groups`, `options`, `product_option_groups` (overrides), `price_history` (trigger), `translation_glossary`, `stations` placeholder column. Composite FKs, RLS, audit triggers on price change.
- `get_public_menu(slug, locale)` security definer: whitelisted columns, visible / non-deleted only, active or read-only restaurants only.
- Seed: ~8 categories, ~45 products (Tunisian café: direct, capucin, express, citronnade, jus de fraise, bambalouni, makroudh, ojja, brik, sandwich tunisien, crêpes…) in FR/AR/EN. Mix of photo and photo-less categories; reusable groups (Sugar, Size with per-product overrides, Extras max 3); badges, allergens, dietary flags; 3 unavailable items.

**Acceptance criteria**

- pgTAP: isolation for every new table and role; `get_public_menu` never returns hidden, deleted or other-tenant rows, nor non-whitelisted columns; price change writes `price_history`.
- `check:rls` passes.

### P1-02 — Menu pure services · M

**Deliverables**

- `effectiveOptionGroup`, `validateSelection` (min/max, availability), `computeLinePrice` / `computeOrderTotal` (integer maths), `displayPrice` ("from"), `applyPercentage(price, pct, step)`, `pickTranslation(fallback chain)`, `normalizeForSearch` (FR/AR rules) and `searchMenu` (uFuzzy wrapper).

**Acceptance criteria**

- 100 % coverage on pricing and selection.
- Search tests: "capucin", "kapsin", "قهوة", "قهوه", "creme", "crème" find the right items.
- Property test: totals are always integers and ≥ 0.

### P1-03 — Media pipeline · M

**Deliverables**

- Signed upload route; processing (sharp: magic bytes, limits, rotate, strip EXIF, AVIF + WebP renditions, thumbhash, dimensions, dominant colour).
- `<MenuImage>` (srcset/sizes, lazy, thumbhash placeholder, no CLS).
- `scripts/seed-media.ts` processes `supabase/seed-media/` (royalty-free photos with `ATTRIBUTION.md`).

**Acceptance criteria**

- Unit/integration: rejects a 6 MB file, a fake extension, oversized dimensions; 640 w rendition < 80 KB on seed photos; EXIF absent from outputs.
- CLS = 0 in the menu E2E.

### P1-04 — Back-office shell · M

**Deliverables**

- App shell: sidebar (desktop) and bottom navigation or drawer (mobile); header with restaurant switcher and user menu; Cmd/Ctrl+K command palette; onboarding checklist widget; page templates with empty, loading and error states; undo-toast helper.

**Acceptance criteria**

- DoD screenshots at 7 widths; keyboard navigation of all navigation and the palette; axe clean; RTL mirrored correctly.

### P1-05 — Menu editor: categories and products · L

**Deliverables**

- Server Actions with Zod: CRUD categories and products; drag-and-drop ordering (dnd-kit, keyboard accessible); availability switch in lists; price input accepting `3,5` / `3.500`; multilingual fields with missing-translation indicators; image upload; category time window (Schedule editor).
- Bulk actions: percentage change with preview and rounding step, hide, duplicate. Undo toasts. `updateTag('menu:…')` on every change.

**Acceptance criteria**

- E2E: create category → product with photo → reorder → toggle unavailable → bulk +10 % with preview → undo.
- The public menu reflects each change on the next request (cache invalidated).
- A manager of B can't mutate A (integration). Screens pass DoD.

### P1-06 — Menu editor: option groups, attributes, live preview · L

**Deliverables**

- Reusable option groups (min/max), linking to products with overrides (rules and per-option prices); badges, allergens, dietary flags.
- **Live mobile preview:** an iframe of the real customer menu in draft mode, updated on save, scroll-synced to the product being edited.

**Acceptance criteria**

- E2E: create "Size" group, link to coffee (+1.500) and juice (+2.000 override) → preview shows "from" prices correctly. Invalid min > max is rejected inline.
- Preview iframe has same-origin framing only.

### P1-07a — Customer menu: page and layout · L

**Deliverables**

- `/t/[token]` and `/r/[slug]`:
  - `'use cache'` menu loader with `cacheTag`;
  - locale resolution;
  - header (cover, logo, name, open/closed from schedule + manual status), "Table N" badge (table route only), collapsible info (hours, Maps, Wi-Fi, socials), language switcher;
  - sticky category bar with scroll-spy;
  - **adaptive layout** (photo grid/list vs typographic list, monogram tiles), product cards with badges and unavailable state;
  - tenant brand theming and restaurant theme mode;
  - skeletons at final size; 404 / closed / suspended (read-only) states.

**Acceptance criteria**

- size-limit: route initial JS ≤ 150 KB gz.
- Lighthouse mobile ≥ 90 in all categories on the preview build; LCP < 2 s in simulated 4G.
- DoD screenshots, including **photo-less** and both demo brand colours; axe clean; RTL correct.
- An invalid or regenerated token → friendly error page, no data leak.

### P1-07b — Customer menu: product sheet, search, filters, SEO · M

**Deliverables**

- Product sheet (Sheet component, URL-synced `?p=`) with full description, allergens and option groups (informational on Basic; interactive selection reserved for Pro ordering); lazy fuzzy search; dietary filters.
- JSON-LD `Restaurant` + `Menu` on `/r/[slug]`; OG image; `noindex` on `/t/*`.

**Acceptance criteria**

- ≤ 3 taps from scan to any product detail.
- Search E2E in FR and AR. Back button closes the sheet.
- JSON-LD validates (schema test); the bundle budget still holds.

### P1-08 — Tables, zones, QR, print tents · M

**Deliverables**

- Migration: `zones`, `tables` (unique global token, partial unique numbers); RLS + pgTAP.
- Back-office: create one or in bulk (1–30), assign zones (zones UI gated by plan; data always available), regenerate token (confirm + audit).
- Print page `/dashboard/tables/print`: A4 / A6 tent templates, logo, number, inline SVG QR (ECC M, ≥ 30 mm), "Scan to order" in FR/AR/EN.

**Acceptance criteria**

- E2E: bulk create 20 tables → print preview → Playwright `page.pdf()` visual baseline; Arabic text rendered correctly (visual check).
- A regenerated token returns the error page immediately on the old URL. A scanned QR in the test (decoded from the SVG) matches the URL.

### P1-09 — Sessions and service requests backend · L

**Deliverables**

- Migration: `table_sessions` (one open per table), `client_sessions`, `service_requests`, `idempotency_keys`, `menu_views` + `menu_view_daily`, `feedbacks`, `notification_receipts`, `notification_incidents`. RLS + pgTAP.
- Realtime triggers (`realtime.send`) on service requests, availability and session close, using the topics validated in P0-08.
- Route handlers:
  - `POST /api/public/sessions` (signed `__Host-` cookie, Turnstile only on anomaly);
  - `POST /api/public/service-requests` (idempotent, cooldowns);
  - `POST /api/public/feedbacks`;
  - `POST /api/public/menu-views`;
  - `GET /api/public/availability`.
- `lib/rate-limit` (Upstash adapter + in-memory adapter, same interface); cron jobs (auto-close sessions, aggregate views, unclaimed-request escalation) via pg_cron + `/api/cron/[job]`.

**Acceptance criteria**

- Integration:
  - GET of `/t/{token}` creates no session;
  - two phones join the same table session;
  - cooldown returns `RATE_LIMITED` with retry-after;
  - the same idempotency key twice → one request;
  - auto-close after the timeout closes client sessions;
  - tenant isolation on all new tables.
- Realtime: a request creation reaches a subscribed staff client.

### P1-10 — Customer service-request UI, feedback, live availability · M

**Deliverables**

- Floating "Call waiter" / "Request bill" (payment method) actions with confirmation state, cooldown countdown and offline handling.
- `s:` channel subscription (lazy) → "Waiter is coming" state when claimed.
- Feedback prompt after the bill request is handled (Basic), with Google review link on 4–5 stars.
- Availability refresh on focus and the lazy `m:` channel.

**Acceptance criteria**

- E2E (two contexts):
  - availability toggled in the back-office → greyed on the customer phone within 5 s;
  - a call shows the claimed state when staff claims it.
- DoD screenshots, axe, reduced-motion check.

### P1-11 — Device pairing, staff accounts (Basic), push plumbing, SW · M

**Deliverables**

- Migration: `staff_devices`, `device_pairing_codes`, `staff_sessions`, `push_subscriptions`; RLS + pgTAP.
- Back-office Devices page:
  - pair with QR or 8-character code (10 min);
  - name, mode (fixed / mobile), revoke;
  - active sessions with remote logout.
- Staff invitation by email (Basic limit: 1 non-owner, `PLAN_LIMIT_REACHED`).
- `/staff/pair` and staff email login on a paired device.
- `scripts/build-sw.ts` + `src/sw/staff-sw.ts` (push handler, notification click focus/open, offline shell); staff manifest; VAPID config; `src/server/admin/push.ts` (send, prune 404/410).

**Acceptance criteria**

- E2E:
  - pair a device → staff logs in → revoke from the back-office → the next staff request is rejected and the screen returns to pairing;
  - a second staff invite on Basic is refused.
- Unit: pairing code expiry and single use. Push send prunes dead subscriptions (mocked endpoint).

### P1-12 — Staff live screen · L

**Deliverables**

- "Start service" screen: audio unlock, Wake Lock (fixed), notification permission and push subscription, connectivity self-test, iOS "Add to Home Screen" guidance.
- Live screen:
  - service requests sorted by age with XXL table numbers, type icon and payment method;
  - "I'm on it" (atomic claim, optimistic with rollback) and "Done";
  - distinct sounds per type, vibration;
  - connection indicator;
  - availability list with one-tap toggle.
- Acks: `POST /api/staff/acks` (batched) → `notification_receipts`. Push on request creation to recipients. Unclaimed > 2 min → manager push and incident.

**Acceptance criteria**

- E2E (customer context + staff context):
  - waiter call appears on the staff screen **< 2 s**, measured from ack timestamps in the test;
  - a claim from device 1 removes the request from device 2 immediately.
- Staff screen DoD at 390 / 768 / 1024 (tablet) / 1440, with 48 px targets verified. Table number readable at 1 m: display token ≥ 56 px, checked in screenshots.

### P1-13 — AI menu import and translation · L · 👤 developer Anthropic API key (low spend limit)

**Deliverables**

- `features/ai`: provider-agnostic interface; Anthropic adapter (`claude-sonnet-5-5` vision extraction with server-side refusal fallback; `claude-haiku-5-5` translations); Zod `MenuDraft`; pricing table; `ai_usage` logging; plan quotas and caps (`AI_QUOTA_EXCEEDED`).
- Import UI: upload 1–6 photos → progress → editable draft table (confidence highlights, price corrections) → import into the menu.
- Translate missing languages (per item, category or whole menu) with the glossary → suggestions to accept.
- Evals: ≥ 6 realistic Tunisian menu fixtures (FR/AR, printed and handwritten) with expected outputs; `pnpm ai:eval`.

**Acceptance criteria**

- CI tests use recorded fixtures (no network).
- The eval run (manual, real API) reports price accuracy and item recall. The owner reviews the numbers before the feature ships.
- Quota exhaustion shows the friendly state. `ai_usage` rows have the correct cost maths. No customer data in prompts (unit test on prompt builders).

### P1-14 — Onboarding wizard and settings · L

**Deliverables**

- Wizard:
  1. venue info and schedule editor (overnight, exceptions);
  2. identity (logo → suggested colour → accessible adjustment preview, cover);
  3. menu (AI import or manual);
  4. tables (bulk) and zones;
  5. print QR;
  6. staff / device pairing.
- Dashboard checklist until complete.
- Settings pages: hours + "close now", languages, theme (colour, mode, card style), links and Wi-Fi, session timeout, business-day cutoff, rounding step.

**Acceptance criteria**

- Scripted E2E of the full onboarding with seeded AI fixtures completes. A human dry run with a stopwatch (owner) confirms the "< 30 min" target.
- Settings changes reflect on the customer menu (cache invalidation). DoD screenshots.

### P1-15 — Minimal Super Admin · M

**Deliverables**

- `/admin` guarded by `platform_role` + **TOTP enrolment and `aal2` enforcement**.
- Restaurant list and search; assign plan; flag overrides with expiry; AI usage per restaurant; audit log viewer (read-only).

**Acceptance criteria**

- E2E: a platform user without `aal2` is forced to enrol TOTP; a non-platform user gets 403; a flag override changes behaviour (e.g. AI quota raised).
- Every admin action is audited (integration).

### P1-16 — Landing, pricing, legal placeholders · M

**Deliverables**

- Marketing pages in FR/AR/EN: hero with an interactive demo (live demo café menu in a phone frame + scannable QR), benefits per segment, pricing (hypothesis prices as configurable content), FAQ, contact (WhatsApp link).
- Legal placeholders (mentions légales, CGU/CGV, privacy) clearly marked "pending legal review". SEO metadata and OG.

**Acceptance criteria**

- Lighthouse mobile ≥ 90 in all categories. DoD screenshots. No layout issues at 7 widths.

### P1-17 — Production readiness and pilot launch · L · 👤 accounts and domain

**Owner actions:**

- Vercel Pro and Supabase Pro accounts (staging + prod projects, Paris);
- Upstash, Resend, Sentry, PostHog, Cloudflare Turnstile;
- domain name;
- Anthropic production key with spend limit;
- pilot venues list.

**Deliverables**

- CD: merge → staging migrations + deploy; tag → approval → prod.
- Env configured; legacy Supabase keys off; asymmetric JWT keys on; Realtime public access off; leaked-password protection on; backups verified.
- Sentry (lazy client on the menu), PostHog server events, uptime probe and status page, security headers verified (securityheaders-style test), k6 smoke (2,000 menu views/min on staging).
- Operations runbook (backups and monthly restore test, key rotation, incident checklist).
- Pilot kit: printed quick guide FR/AR, staff training checklist (20 min).

**Acceptance criteria**

- Staging and production live in `eu-west-3` / `cdg1`. Restore test performed and documented.
- MVP acceptance criteria (11-quality) verified on staging with the demo café.
- **Milestone 1 starts:** 3 pilot cafés onboarded.

---

## Owner actions and stop points summary

| When           | Action                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| P0-02 start    | Provide the private GitHub remote URL                                        |
| P0-06 end      | ⛔ Choose the visual direction                                               |
| P1-13 start    | Developer Anthropic API key with a low spend limit (local `.env.local` only) |
| P1-13 end      | Review AI eval numbers                                                       |
| P1-14 end      | Stopwatch dry run of onboarding (< 30 min)                                   |
| P1-17 start    | Hosting/service accounts, domain, production AI key, pilot venues            |
| Before Phase 3 | Lawyer (INPDP) and accountant (invoicing) — ADR-0028                         |

## Risks and mitigations

| Risk                                        | Mitigation                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Anon can't use private Realtime channels    | Spike P0-08 first. Fallback: anonymous sign-in with a raised per-IP limit (ADR-0008)                          |
| Shadow-session minting flaw (token reuse)   | Retired: P0-09 proved tokens are single-use (ADR-0010). Fallback kept: own signing key                        |
| 150 KB budget too tight with Next runtime   | size-limit from P1-07a. Islands only, lazy realtime/search/Motion features. Measure early in P0-06 prototypes |
| AI extraction accuracy on handwritten menus | Evals before ship. Editable draft. Manual path always available                                               |
| Next.js security release on 2026-10-14      | Adopt immediately in P0-01 (version policy exception)                                                         |
| Scope creep in Phase 1 (staff screen added) | Strict Phase 1 staff scope (ADR-0015). PIN, zones and kanban stay in Phase 2                                  |
