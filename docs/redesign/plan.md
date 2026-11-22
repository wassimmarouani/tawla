# Taply — premium redesign ("Méditerranée moderne") — Phase 0 plan

Status: **Phase 0 discovery done — waiting for "go" before Phase 1.**

## Stack (confirmed)

- Next.js 16 App Router (RSC, `use cache`, `connection()`), TypeScript strict.
- Tailwind 4 with `@theme`; tokens are the source of truth in `src/styles/tokens.ts` → generated `src/styles/tokens.css` via `pnpm tokens:build`. **Raw hex is already banned in components (lint-enforced).**
- next-intl (fr default, ar RTL, en), messages in `src/messages/{fr,ar,en}/*.json`.
- Supabase (Postgres 17, Auth, Realtime), Drizzle under `withRls`.
- Component library: shadcn-style in `src/components/ui/` (button, badge, card, dialog, drawer, dropdown-menu, input, select, switch, tabs, tooltip, checkbox, radio-group, textarea, label, separator, skeleton, sonner, command, avatar, input-group).
- Icons: lucide-react.
- Menu theme: config-driven — `restaurant.theme` jsonb carries a `variant` enum (`src/lib/menu/variants.ts`, `restaurant-theme.ts`). No schema change needed to add presets.

## What the codebase ALREADY matches in the spec (good news)

- **Fonts:** Geist Sans + IBM Plex Sans Arabic (`src/styles/fonts.ts`) + Fraunces for display (`globals.css`). Exactly the spec's typography.
- **Tokens-only, logical properties, RTL, @theme** — already the house rule (CLAUDE.md).
- **All routes exist:** marketing (`/`, `/pricing`, `/how-it-works`, `/venues`, `/legal/[page]`), auth (`/login`, `/signup`, `/reset*`, `/invite/accept`), owner app (`/dashboard` + menu/import/options/products, `/settings`, `/setup`, `/tables/print`, `/team`, `/analytics`), console (`/admin/(console)` + `/audit` + `/restaurants/[id]`, `/admin/mfa`), public menu (`/r/[slug]`, `/t/[token]`), staff (`/staff`, `/login`, `/pair`).
- **A dev design route already exists:** `/dev/design-system/[theme]` and `/dev/directions/[direction]/[variant]`.
- **Menu variant/theme engine** already lives in `src/lib/menu/variants.ts` + `demo-variants.ts` + `templates.ts`.

## What the spec actually changes (the real work)

1. **Re-palette** to "Méditerranée moderne": brand indigo (Bleu Sidi Bou #2440E6 primary) — current brand is a softer blue #1d5aa6; add **Harissa coral** accent + **Jasmin** highlight (Recommandé badge) + refined porcelain neutrals + Night scale for dark sections/staff. All via `tokens.ts` (+ contrast tests already enforced).
2. **Complete the component set** the spec names that we don't have yet: StatCard, SegmentedControl, Combobox, Pagination, Breadcrumbs, PageHeader, Monogram, EmptyState, StatusDot, PriceTag, a Sheet (we have drawer — map it), Toast (we have sonner — map it). Fill the `/dev/design-system` route with every component × state × fr/ar.
3. **Behave states** (ui-ux-behaves): every container (page/table/form/dialog) gets loading / empty / ready / error / warning. Build a `taply-design-system` skill with the design-system mapping (behave key → component).
4. **Per-surface polish** in spec order 6.1 marketing → 6.3 console → 6.4 public menu + 7 presets → 6.2 owner app.
5. **`formatTND(value,{context})`** single money formatter (menu/marketing/console variants).
6. **Project skill** `.claude/skills/taply-design-system/SKILL.md` (spec §9).

## Phased plan (gates in **bold**)

- **Phase 0 (now):** this plan + inventory + decisions. **GATE — your "go".**
- Phase 1 — Foundation: tokens re-palette, Tailwind mapping, base/focus, missing components, `/dev/design-system` page, `formatTND`, `taply-design-system` skill, `design-system/MASTER.md`. Screenshots of `/dev/design-system` fr+ar. **GATE.**
- Phase 2a — Marketing (6.1): plans-config single source (home table = pricing = FAQ, "Bientôt" everywhere), header/hero/bento/dark staff band/templates showcase/pricing/auth. **GATE.**
- Phase 2b — Console (6.3): shell, PageHeader, StatCards, DataTable (ui-ux-table), venue detail, audit. **GATE.**
- Phase 2c — Public menu + template engine (6.4): `MenuTheme` presets (Médina, Specialty, Trattoria, Atelier, Nocturne, Street, Gelato), menu page polish, table-service states, fix mismatched seed photos. **GATE.**
- Phase 2d — Owner app (6.2): shell, dashboard, menu editor, photo import stepper, tables/QR, staff screen (Night), settings/billing. **GATE.**
- Phase 3 — QA: after-screenshots, axe zero serious/critical, Lighthouse budgets, RTL/200%/375px, copy pass, typecheck+lint+tests green.

## Risks / constraints (must flag before "go")

1. **This REPLACES the design just merged this session** (#60–#63 warm editorial bento). The new brand is a more saturated indigo + coral/jasmin accents. Confirm you want to overwrite it.
2. **CI is blocked on GitHub Actions billing** — every PR will show red checks. Gate verification is local (`pnpm verify`). The production build runs on Vercel on push to main.
3. **`next build` currently OOMs / hard-crashes locally on this machine** in the prerender worker phase (environmental, not code — it compiles + generates pages, then aborts). Local gate relies on typecheck + lint + unit tests + screenshots; the real production build is Vercel's.
4. **Scale:** this is a multi-week initiative. Each phase ships as its own PR with a local-verified gate and screenshots; nothing merges without your review.
5. **No schema / RLS / auth / route / i18n-key changes** (spec hard rule 1–2). Any logic need goes to `backlog.md`, not implemented.

## Open decisions (need your answer at the gate)

- D1: Replace the current merged design with "Méditerranée moderne" — **yes/no**?
- D2: Brand primary — keep refining current blue, or go to the spec's saturated indigo #2440E6? (affects every surface)
- D3: Start order — spec says 6.1 → 6.3 → 6.4 → 6.2. Keep, or do the **public menu (6.4) first** since it's what guests + sales see?
