# Taply — Redesign audit (Phase 0)

Date: 2026-11-22 · Branch: `redesign/v2` (off `redesign/premium`). No code changed in this phase.

> **Tooling note (brief ground rule 0).** The `ui-ux-pro-max` skill is installed as **`SKILL.md`
> only** — there is no `scripts/search.py` anywhere under `C:/Users/MSI/.claude/**` or the plugin
> dir. The brief's scripted workflow (`search.py --design-system --persist --domain …` with logged
> output) therefore cannot be run. This audit and the following phases use the skill's **SKILL.md
> priority rules** (Accessibility → Touch → Performance → Style → Layout → Type/Color → Animation →
> Forms → Navigation → Charts) plus the project's existing `design-system/MASTER.md` as the design
> authority, instead of `search.py` outputs.

> **Prior work this builds on.** A large redesign already landed on `redesign/premium`
> (Méditerranée moderne): re-paletted tokens (`src/styles/tokens.ts`, Bleu Sidi Bou + Harissa +
> Jasmin), 8 new primitives (`src/components/ui/`), `formatTND`, the `/dev/design-system` route,
> `design-system/MASTER.md`, a marketing Jasmin/pricing pass, a console primitives pass, and the
> 7-preset menu variant engine. This audit measures the **current** `redesign/premium` state, not
> the pre-redesign app, so several brief complaints are already partly addressed (noted inline).

---

## 1. Route + component map

### Marketing (`src/app/[locale]/(marketing)/`, feature `src/features/marketing/`)

| Route           | Page                    | Key components                                                                                                                                    |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | `page.tsx` → `Landing`  | `marketing-shell`, `landing`, `hero-stats`, `demos-section`, `variant-showcase`, `services-bento`, `plan-matrix`, `demo-phone`, `landing-visuals` |
| `/pricing`      | `pricing/page.tsx`      | `pricing-page` (reads `publicPlans()` → `planCards()`)                                                                                            |
| `/how-it-works` | `how-it-works/page.tsx` | `how-page`                                                                                                                                        |
| `/venues`       | `venues/page.tsx`       | `directory-page`, `demos-filter`                                                                                                                  |
| `/legal/[page]` | `legal/[page]/page.tsx` | `legal-page`, `credits-page`                                                                                                                      |

### Auth (`src/app/[locale]/(auth)/`, feature `src/features/auth/`)

`/login`, `/signup`(+`/confirm`), `/reset`(+`/confirm`,`/new`), `/invite/accept`. Shared
`AuthHeading`; forms in `features/auth`.

### Back office (`src/app/[locale]/dashboard/`, feature `src/features/backoffice`, `menu-editor`, `tables`, `settings`, `analytics`, `onboarding`)

`/dashboard` (Today), `/dashboard/menu`(+`/products/[id]`,`/new`,`/options`,`/import`),
`/dashboard/tables`(+`/print`), `/dashboard/team`, `/dashboard/settings`, `/dashboard/setup`,
`/dashboard/analytics`. Active-nav via `backoffice/components/nav-links.tsx` (sidebar ≥1024 / bottom
tabbar). **This is the surface with the least redesign so far (brief Phase 3 / plan Phase 2d — pending).**

### Super Admin console (`src/app/[locale]/admin/`, feature `src/features/platform/`)

`/admin` (venues), `/admin/audit`, `/admin/restaurants/[id]`, `/admin/mfa`. Shell `admin/layout.tsx`

- `console-nav`; screens in `console-screens.tsx`. (Primitives pass done on `redesign/premium`.)

### Staff (`src/app/[locale]/staff/`, feature `src/features/staff`, `table-service/`)

`/staff` (team screen), `/staff/login`, `/staff/pair`. **Night theme + 2 m readability not yet done.**

### Public menu (`src/app/[locale]/r/[slug]`, `/t/[token]`, feature `src/features/menu/`)

`public-menu-view.tsx` (shell) → `menu-header`, `category-nav`, `menu-filters`, `menu-search`,
`menu-section` (cards/rows), product sheet via `?p=`, `availability-live` (realtime),
`service-bar` (call/bill). Theme engine: `src/lib/menu/variants.ts` + `demo-variants.ts` +
`restaurant-theme.ts`; overrides in `globals.css` `[data-variant="…"]`.

---

## 2. How the menu "templates" work today — **confirmed: recolors, not templates**

- **One shared presentation** for every venue: `public-menu-view.tsx` + `menu-section.tsx` render
  all menus. There is no per-template layout module.
- A venue picks a **variant** (`restaurants.theme.variant` jsonb); `MENU_VARIANTS` in
  `src/lib/menu/variants.ts` lists the 7 presets (`medina, specialty, trattoria, atelier, nocturne,
street, gelato` + default). Each preset is **CSS-custom-property overrides** under
  `[data-variant="<id>"]` in `globals.css` (42 such rules): display font, body font, radius, shadow
  tier, accent — **plus `variantFonts` and `variantPrefersDark`**.
- **What differs between venues today:** colours, fonts, corner radius, one accent. **What does
  NOT differ:** the layout archetype, navigation pattern, card anatomy, item-detail presentation,
  imagery treatment, ornament, motion. → The brief's core complaint is **correct**: they are
  recolors of one layout, which fails the brief's §6.2 Uniqueness contract (no two templates may
  share >2 of axes 2–10; today they share **all** of them).
- Converting to the brief's model (headless engine + `templates/<slug>/` presentation modules +
  registry + dynamic import, 10 structurally distinct templates) is the **largest** item in the
  brief and a real architectural refactor of `src/features/menu`.

---

## 3. Problems vs SKILL.md Quick Reference (§1–§9)

**§1 Accessibility** — Mostly strong (tokens enforce AA via `tokens.test.ts`; logical props;
visible focus rings are the house rule). Gaps: no end-to-end axe run captured; staff screen not yet
built for 2 m / contrast; AR RTL not screenshot-verified this session (Docker down).

**§2 Touch & interaction** — Targets ≥44/48 px are enforced in primitives. Gap: the staff team
screen (one-tap acknowledge, big targets, sound/vibration) is unredesigned.

**§3 Performance** — Menu bundle budget exists (`pnpm size`, <150 KB gz). **Risk:** the shared
menu ships one layout for all; the brief's per-template dynamic import would _reduce_ per-venue JS.
`next build` OOMs locally (environmental) so Lighthouse is Vercel-only. **Demo photos:** the
repeated/wrong-Unsplash issue was **fixed on `redesign/premium`** (`src/lib/menu/demo-photos.ts`
now a verified hero allowlist; non-heroes fall back to typographic). Landing hero still hotlinks 2
Unsplash photos (`landing.tsx` `HeroCollage`).

**§4 Style** — Tokens-only, Lucide-only, no emoji: enforced by lint. Jasmin now = Recommandé
(premium pass). Gap: the 7 presets look same-shaped (see §2).

**§5 Layout/responsive** — Mobile-first, 7 breakpoints are the house rule; `contain-paint` used to
stop mobile table overflow. Not re-verified visually this session (Docker).

**§6 Type/Color** — Geist + IBM Plex Sans Arabic + Fraunces, tokenised. Each new template will need
its **own** Latin+Arabic pairing (brief §6.2 axis 6) — not yet done.

**§7 Animation** — Landing has ~7 decorative animations (aurora drift, marquee, float). `globals.css`
has `prefers-reduced-motion` blocks but a full audit that **every** decoration is disabled is
pending (backlog P2).

**§8 Forms** — Signup/login use Zod + inline validation + busy submit (house rule). Re-verify multi-
step progress + blur validation in the redesign.

**§9 Navigation** — Marketing header, back-office nav-links (active state), console-nav (active
state) all present. Bottom-nav ≤5 respected.

---

## 4. The specific issues raised in the brief — current status

| Brief issue                                                                    | Status on `redesign/premium`                                                                                   | Action                                                                                                |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Demo menus are recolors, identical structure                                   | **True** (§2 above)                                                                                            | Phase 4: real per-template modules                                                                    |
| Same Unsplash photo reused across items                                        | **Fixed** (`demo-photos.ts` hero allowlist)                                                                    | Keep; extend per-template unique imagery                                                              |
| Same photo on landing hero                                                     | Still 2 hotlinked Unsplash in `landing.tsx`                                                                    | Phase 2: replace with template phone + staff alert                                                    |
| Landing repeats itself (marquee + two "Pensé pour…" + two demo CTAs)           | **Still present** (`landing.tsx`: `SOCIAL_PROOF`, `segments`, marquee; hero has Start + WhatsApp + watch-demo) | Phase 2: merge audience sections into one "Pour votre établissement"; single primary CTA per viewport |
| Landing pricing shows only Menu QR + Basic as cards; Pro/Premium only in table | **Still present** (`landing.tsx` `Offers` filters to `available`)                                              | Phase 2: all four plans as cards, Basic emphasised                                                    |
| Bar Citadelle items have no descriptions                                       | **Still present** (demo data)                                                                                  | Phase 4.4: add FR/AR/EN descriptions to every demo item                                               |

## 5. Lighthouse baseline — **BLOCKED this session**

Cannot capture `/`, `/pricing` and two menu slugs: local Supabase/Docker is wedged (recurring on
this machine) so the app can't serve menus, and `next build` OOMs locally. Baseline must run against
the **Vercel preview** of `redesign/v2` (or a revived local Docker). Recorded as `TODO(audit)` with
the metric table (Performance / Accessibility / LCP / CLS / JS-per-route) to be filled from Vercel.

---

## 6. Recommended execution order (given scope + blockers)

The brief is a multi-week initiative (its own `docs/redesign/plan.md` says so) and its `search.py`
method is unavailable. Realistic order, each its own commit on `redesign/v2`, building on the
premium foundation rather than restarting:

1. **Brand directions** (2 options) → `design-system/BRAND-DIRECTIONS.md`; confirm/extend tokens.
2. **Template MATRIX** → `design-system/templates/MATRIX.md` (10 templates × 10 axes, uniqueness
   contract) — the design contract that makes the templates genuinely distinct **before** any build.
3. **Headless menu engine + registry** refactor (data/i18n/search/filters/call-bill extracted from
   presentation) — the enabler for per-template modules.
4. **Templates** `templates/<slug>/` one at a time, validated against MATRIX (10 total; the 7 presets
   become the first real template modules, then 3 new).
5. **Marketing CRO pass** (Phase 2 above).
6. **Back office + staff screen** (Phase 3 — the least-touched surface).
7. **QA**: axe, Lighthouse before/after (Vercel), RTL/200 %/keyboard, side-by-side template sheet,
   `CHANGELOG.md`, `TODO(copy)` + data-model proposals (flavor scale, price unit, wine pairing, size
   selector, scoop builder — all need optional schema fields: **migration plan, await approval**).
