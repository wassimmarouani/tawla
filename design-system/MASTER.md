# Taply design system — MASTER

Palette **"Méditerranée moderne"**. This is the one-page contract for building any Taply UI. When a
rule here conflicts with a component, the component is wrong. Deeper token tables live in
`.claude/skills/taply-design-system/references/tokens.md`; the machine-checked source is
`src/styles/tokens.ts`.

## 1. Tokens — the only colour source

- **Edit `src/styles/tokens.ts`, never `tokens.css`.** Run `pnpm tokens:build` to regenerate
  `src/styles/tokens.css`; `src/styles/tokens.test.ts` fails if the CSS is stale or any contrast
  pair drops below WCAG AA. Both run under `pnpm test`.
- **No raw hex and no arbitrary colour in product code** (lint-enforced). Use Tailwind classes that
  map to tokens: `bg-card`, `text-foreground`, `bg-brand`, `text-brand-text`, `bg-accent-harissa`,
  `text-on-highlight-jasmin`, … Vendored primitives in `src/components/ui/` may use `calc()`
  geometry but never a colour literal.
- Every token is themed for light and dark. Never hard-code a colour "for dark mode" — add/adjust the
  token.

### Token roles (names are stable; components depend on them)

| Role                         | Tokens                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces                     | `background` (canvas), `card`/`popover` (raised), `muted`/`secondary`/`accent` (subtle fills), `border`, `input` (control outline)                                                                                                                      |
| Text                         | `foreground` (ink), `muted-foreground` (secondary ink), `*-foreground` on their surface                                                                                                                                                                 |
| Brand (Bleu Sidi Bou)        | `brand-solid`/`brand-accent` = primary (#2440E6), `brand-on-solid` (text on it), `brand-text` (brand text on light surfaces, 700), `brand-subtle` + `brand-on-subtle` (tinted chips), `brand-panel` + `brand-on-panel` (big indigo surfaces, e.g. auth) |
| Harissa (attention / promos) | `accent-harissa` (fill or text-on-subtle), `on-accent-harissa` (text on the fill), `accent-harissa-subtle`                                                                                                                                              |
| Jasmin (Recommandé badge)    | `highlight-jasmin`, `on-highlight-jasmin` (ink — never white on Jasmin)                                                                                                                                                                                 |
| Semantic                     | `success`/`success-subtle`, `warning`/`warning-subtle`, `destructive`/`destructive-foreground`/`destructive-subtle`/`destructive-text`, `info`/`info-subtle`                                                                                            |
| Over-photo controls          | `scrim`, `on-scrim` (dark translucent in both themes)                                                                                                                                                                                                   |
| Charts                       | `chart-1`…`chart-5` (5 distinguishable hues)                                                                                                                                                                                                            |

Aliases emitted for shadcn compatibility: `primary`→`brand-solid`, `ring`→`brand-text`, `sidebar-*`.

## 2. Component inventory

Import from `@/components/ui/<file>` unless noted. Prefer these over bespoke markup.

| Component                                                              | Import                                        | When                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Button                                                                 | `ui/button`                                   | Any action. One primary per view. `size="lg"` (48px) for staff.                                 |
| Badge                                                                  | `ui/badge`                                    | Status/label chips. `variant`: default/soft/secondary/outline/success/warning/destructive/info. |
| Card                                                                   | `ui/card`                                     | Grouped content surface.                                                                        |
| Dialog / Drawer                                                        | `ui/dialog`, `ui/drawer`                      | Modal / bottom-sheet. Drawer is the mobile "Sheet".                                             |
| DropdownMenu / Select / Command                                        | `ui/dropdown-menu`, `ui/select`, `ui/command` | Menus, pickers, command palette.                                                                |
| Input / Textarea / Label / Checkbox / RadioGroup / Switch / InputGroup | `ui/*`                                        | Forms. Text fields use `dir="auto"`.                                                            |
| Tabs                                                                   | `ui/tabs`                                     | Switch views, URL-persisted where it matters.                                                   |
| Tooltip / Separator / Skeleton / Avatar / Sonner                       | `ui/*`                                        | Supporting bits. Toasts via `sonner`.                                                           |
| **StatCard**                                                           | `ui/stat-card`                                | A dashboard metric: label, value, delta (arrow + text), sparkline slot, footnote, `loading`.    |
| **PageHeader**                                                         | `ui/page-header`                              | Top of a page/section: title, subtitle, eyebrow, actions (one primary).                         |
| **Monogram**                                                           | `ui/monogram`                                 | Deterministic placeholder avatar from a name. `aria-hidden` (name shown nearby).                |
| **StatusDot**                                                          | `ui/status-dot`                               | Dot + label. Never colour alone.                                                                |
| **PriceTag**                                                           | `ui/price-tag`                                | Money display via `formatTND`; `tabular-nums`; optional `prefix` ("À partir de").               |
| **SegmentedControl**                                                   | `ui/segmented-control`                        | Single choice, 2–4 options; radiogroup + arrow keys.                                            |
| **Pagination**                                                         | `ui/pagination`                               | "1–25 sur N" + prev/next; ends disabled, not hidden.                                            |
| **Breadcrumbs**                                                        | `ui/breadcrumbs`                              | nav > ol; last crumb `aria-current="page"`.                                                     |
| EmptyState / ErrorState / LoadingRegion / OfflineBanner                | `@/components/states`                         | Container states (see §3). EmptyState lives here, not in `ui/`.                                 |

## 3. Required states per container

Every page, table, form, dialog and async region must handle all of:

- **loading** — skeletons (`Skeleton`, `LoadingRegion`), not a bare spinner; keep layout stable.
- **empty** — `EmptyState` with the next useful action ("Ajoutez votre première catégorie").
- **ready** — the normal content.
- **error** — `ErrorState` with a retry; never a dead end.
- **warning / offline** — `OfflineBanner` or inline warning (stale realtime, quota near limit, unsaved).

A view that renders only "ready" is incomplete. Forms also need field-level validation (Zod) and a
disabled/busy submit state.

## 4. Money — always `formatTND`

- Amounts are **integer millimes**. Never floats, never `toFixed`. The server recomputes every total.
- `formatTND(millimes, { context, locale })`:
  - `menu` → `2,500 DT` (fr) / `2.500 د.ت` (ar) / `TND 2.500` (en) — always 3 decimals.
  - `marketing` → drops millimes when zero: `39 DT`; keeps them otherwise.
  - `console` → always 3 decimals, rendered `tabular-nums` (use `PriceTag`).
- Use `<PriceTag>` in UI; `formatMoney`/`formatMoneyDelta` remain for existing callers and deltas.

## 5. Copy rules

- **No hard-coded user-facing text** — every string (including `aria-label`, `alt` fallbacks) lives
  in `src/messages/{fr,ar,en}/*.json`; add a key to **all three** locales. (The `/dev/design-system`
  route is developer tooling and is exempt.)
- Sentence case, not Title Case. Buttons are **verb + noun** ("Ajouter une catégorie", "Publier le
  menu"), not "OK"/"Submit".
- fr is the default; ar is RTL; en is the fallback. Keep terms consistent across locales.

## 6. Layout, RTL & a11y

- **Logical properties only**: `ms-/me-/ps-/pe-/start-/end-`, never `ml-/pr-/left-`. Mirror
  directional icons in RTL (`rtl:-scale-x-100`).
- Mobile-first; flawless at 360/390/430/768/1024/1280/1440. No horizontal scroll, no overlap, no
  truncation. Safe areas + `dvh`.
- Touch targets ≥ 44px (≥ 48px staff). Visible focus everywhere:
  `focus-visible:ring-2 focus-visible:ring-ring`.
- WCAG 2.2 AA: keyboard paths, never colour alone, `prefers-reduced-motion` respected. axe must
  report zero serious/critical.

## 7. Performance budgets

- Customer menu: **< 150 KB gz initial JS**. No TanStack Query or Supabase client in its initial
  bundle; lazy-load realtime, search and Motion.
- `pnpm size` budgets and Lighthouse thresholds hold for touched pages.

## 8. Pre-merge checklist

- [ ] `pnpm tokens:build` leaves no diff; `pnpm test` green (contrast + units).
- [ ] `pnpm typecheck` and `pnpm lint` (`--max-warnings=0`) green.
- [ ] No raw hex / arbitrary colour; logical properties only; tokens for everything.
- [ ] All four+ container states handled; forms validate with Zod.
- [ ] All strings in the three message files; `PriceTag`/`formatTND` for money.
- [ ] Screens reviewed at 390/768/1440 × light/dark × FR/AR; RTL mirrored; no overflow.
- [ ] axe zero serious/critical; keyboard + visible focus; targets ≥ 44/48px.
- [ ] Bundle + Lighthouse budgets hold; Conventional Commit with a summary of what to check.
