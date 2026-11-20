---
name: taply-design-system
description: Taply's design system ("Méditerranée moderne"). Use for ANY change to Taply UI — building or editing a page, component, screen, or style in the marketing site, back-office console, owner app, public QR menu, or staff PWA; adding or restyling a component; choosing colours, spacing, or typography; adding a menu theme preset; or formatting money/prices. Covers where design tokens live and why raw hex is banned, the component inventory and import paths, the menu theme engine, required container states, copy rules, formatTND, and the a11y/perf budgets.
---

# Taply design system

Palette **"Méditerranée moderne"**: porcelain neutrals, brand indigo **Bleu Sidi Bou** (#2440E6),
plus two warm Tunisian accents — **Harissa** coral (attention/promotions) and **Jasmin** gold
(Recommandé badge). The full one-page contract is `design-system/MASTER.md`; the token table is
`.claude/skills/taply-design-system/references/tokens.md`; the machine-checked source is
`src/styles/tokens.ts`.

## Tokens — the only colour source

- **Edit `src/styles/tokens.ts`.** Then run `pnpm tokens:build` to regenerate `src/styles/tokens.css`
  (never hand-edit the `.css`). `src/styles/tokens.test.ts` fails if the CSS is stale **or** any
  contrast pair in `CONTRAST_PAIRS` drops below WCAG AA — both run under `pnpm test`.
- Adding a colour = add the name to `COLOR_TOKENS`, give it a value in **both** `light` and `dark`,
  and add any text/UI pair to `CONTRAST_PAIRS`. If a pair fails, darken the foreground or lighten the
  subtle until it passes; don't lower the threshold.
- **Raw hex and arbitrary colour are banned in product code** (lint-enforced). Use token-mapped
  Tailwind classes: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
  `bg-brand text-on-brand`, `text-brand-text`, `bg-brand-subtle text-brand-on-subtle`,
  `bg-accent-harissa text-on-accent-harissa`, `bg-highlight-jasmin text-on-highlight-jasmin`,
  `bg-success-subtle text-success`, etc.
- Vendored primitives in `src/components/ui/` may use `calc()` geometry and arbitrary **sizing**
  (`size-[1.125em]`) but **never a colour literal** (lint-enforced).
- Token roles live in `references/tokens.md`. Short version: surfaces (`background`/`card`/`muted`/
  `border`/`input`), text (`foreground`/`muted-foreground`), brand (`brand-solid`/`brand-on-solid`/
  `brand-text`/`brand-subtle`/`brand-on-subtle`/`brand-panel`/`brand-on-panel`), Harissa + Jasmin,
  semantic (`success`/`warning`/`destructive`/`info` + `-subtle`), `scrim`/`on-scrim`, `chart-1..5`.

## Component inventory

Import from `@/components/ui/<file>`. Prefer these over bespoke markup.

- **Primitives:** `button`, `badge`, `card`, `dialog`, `drawer` (mobile "Sheet"), `dropdown-menu`,
  `select`, `command`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `switch`,
  `input-group`, `tabs`, `tooltip`, `separator`, `skeleton`, `avatar`, `sonner` (toasts).
- **Redesign additions:**
  - `stat-card` — `StatCard`: metric tile (label, value, delta as arrow + text, sparkline slot,
    footnote, `loading`). Delta never relies on colour alone.
  - `page-header` — `PageHeader`: title, subtitle, eyebrow, actions (one primary).
  - `monogram` — `Monogram`: deterministic placeholder avatar from a name; `aria-hidden`.
  - `status-dot` — `StatusDot`: dot + label (never colour alone); variants neutral/success/warning/
    danger/info.
  - `price-tag` — `PriceTag`: money via `formatTND`, `tabular-nums`, optional `prefix`.
  - `segmented-control` — `SegmentedControl`: single choice, radiogroup + arrow-key focus.
  - `pagination` — `Pagination`: "1–25 sur N" + prev/next; ends disabled, not hidden.
  - `breadcrumbs` — `Breadcrumbs`: nav > ol; last crumb `aria-current="page"`.
- **Container states:** `@/components/states` → `EmptyState`, `ErrorState`, `LoadingRegion`,
  `OfflineBanner`. (EmptyState lives here, not in `ui/`.)

See every component × state × FR/AR live at `/dev/design-system/{light|dark}` (dev-only).

## Menu theme engine (public QR menu)

Each venue picks one visual **variant** via `restaurants.theme.variant` (jsonb) — no schema change to
add presets. Variants live in `src/lib/menu/variants.ts` (`MENU_VARIANTS`, `variantFonts`,
`variantPrefersDark`) and override CSS custom properties through `[data-variant="<id>"]` in
`globals.css` (display font, body font, radius, shadow tier, accent). **Components stay structurally
identical — only tokens/vars change.**

### Checklist for adding a preset

1. Add the id to `MENU_VARIANTS`; declare its Google Fonts in `variantFonts` (return `null` to reuse
   the already-loaded faces and protect the budget); set `variantPrefersDark` if it defaults to dark.
2. Define its `[data-variant="<id>"]` overrides in `globals.css` using **token vars only** (no hex).
3. **Contrast:** verify text/price/badge pairs hit AA in the preset's own palette, light and dark.
4. **RTL:** check the preset in Arabic — mirrored layout, logical properties, no clipped display font.
5. **No-photo mode:** the menu must look intentional when items have no image (most pilots) — rely on
   type, spacing, and the accent, not photos.
6. **Dark variant:** every preset renders in dark mode; re-check scrim/overlay on photo headers.
7. Add it to the `/dev/directions` prototype and screenshot FR + AR, light + dark.

## Required states per container

Every page, table, form, dialog, and async region handles: **loading** (skeletons, stable layout),
**empty** (`EmptyState` with the next action), **ready**, **error** (`ErrorState` with retry),
**warning/offline** (`OfflineBanner` / inline). A view that only renders "ready" is incomplete. Forms
also need Zod field validation and a disabled/busy submit.

## Copy & money

- **No hard-coded user-facing text** (including `aria-label`, `alt` fallbacks). Strings live in
  `src/messages/{fr,ar,en}/*.json` — add every new key to **all three** locales. (`/dev/*` routes are
  tooling and exempt.)
- Sentence case. Buttons are **verb + noun** ("Publier le menu"), not "OK". fr default, ar RTL,
  en fallback; keep terms consistent.
- Money is **integer millimes**; the server recomputes every total; UI is display-only. Use
  `<PriceTag>` or `formatTND(millimes, { context: 'menu' | 'marketing' | 'console', locale })`:
  `menu`/`console` keep 3 decimals (console `tabular-nums`); `marketing` drops the millimes on round
  amounts (`39 DT`). `formatMoney`/`formatMoneyDelta` remain for existing callers and deltas.

## Accessibility & performance budgets

- **Logical properties only** (`ms-/me-/ps-/pe-/start-/end-`); mirror directional icons in RTL
  (`rtl:-scale-x-100`). Text fields use `dir="auto"`.
- Mobile-first, flawless at 360/390/430/768/1024/1280/1440 — no horizontal scroll, overlap, or
  truncation; safe areas + `dvh`.
- Targets ≥ 44px (≥ 48px staff). Visible focus everywhere
  (`focus-visible:ring-2 focus-visible:ring-ring`). WCAG 2.2 AA, keyboard paths, never colour alone,
  `prefers-reduced-motion` respected. axe: zero serious/critical.
- Customer menu **< 150 KB gz initial JS** — no TanStack Query or Supabase client in its initial
  bundle; lazy-load realtime, search, Motion. `pnpm size` + Lighthouse budgets hold on touched pages.

## Pre-merge checklist

- [ ] `pnpm tokens:build` leaves no diff; `pnpm test` green (contrast + units).
- [ ] `pnpm typecheck` and `pnpm lint` (`--max-warnings=0`) green.
- [ ] No raw hex / arbitrary colour; logical properties only; tokens for everything.
- [ ] All four+ container states handled; forms validate with Zod.
- [ ] All strings in the three message files; `PriceTag`/`formatTND` for money.
- [ ] Screens reviewed at 390/768/1440 × light/dark × FR/AR; RTL mirrored; no overflow.
- [ ] axe zero serious/critical; keyboard + visible focus; targets ≥ 44/48px.
- [ ] Bundle + Lighthouse budgets hold; Conventional Commit with a summary of what to check.
