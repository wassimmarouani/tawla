# ADR-0027 — Design-in-code with screenshot validation; three visual directions before building screens

- Status: Accepted (visual direction pending the owner's choice in task P0-06)
- Date: 2026-10-11
- Audit refs: Q5, F4, F5, F6, T9, spec §13

## Context

- No mockups or brand assets exist. The owner accepted design-in-code validated by Playwright screenshots, replacing the spec's "Figma before every screen" rule (§13.5).
- Reference bar:
  - Linear for back-office calm;
  - Airbnb / Uber Eats for appetite-first menus;
  - modern kitchen display systems for staff screens.
- The customer menu must look premium with **any** restaurant brand colour and with **no photos at all**: most café items ("direct", "capucin") have none.

## Decision

1. **Visual direction first (P0-06).** Before building any production screen, three distinct directions for the Tawla platform brand are proposed. Each has a palette, a typography pairing (Latin + Arabic) and a component style. Each is shown as screenshots of **the same customer menu screen** at **390 px**:
   - light and dark;
   - FR and AR;
   - photo-rich and photo-less variants;
   - with two different restaurant brand colours.

   The owner picks one, and it becomes ADR-0029.

2. **Token-first design system** (`src/styles/tokens.css`, Tailwind v4 `@theme`):
   - spacing on a 4 px grid;
   - radii 8 / 16 / 24 + full;
   - type scale 12 / 14 / 16 / 18 / 24 / 32 / 40, **plus display sizes 56 / 72 / 96** for staff table numbers (F5);
   - 3 shadow levels;
   - motion 150 ms (micro) / 250 ms (transitions), ease-out;
   - semantic colours (success, warning, danger, info) with 50–950 scales;
   - z-index scale; touch target minimums (44 px customer, 48 px staff).

   Components use tokens only. A lint rule bans arbitrary Tailwind values (`[#…]`, `[13px]`) outside `tokens.css`.

3. **Tenant brand theming:**
   - `generateBrandScale(hex)` in `src/lib/theme/brand.ts` builds an OKLCH 50–950 scale with culori;
   - `resolveBrandTheme(colour, surface)` resolves the roles used on each surface (light and dark): `solid` keeps the owner's exact colour as the button fill whenever a label reaches 4.5:1 on it (ink or paper text); `text` ≥ 4.5:1 and `accent` (active tabs, borders) ≥ 3:1 against the surface; `subtle` tint with `onSubtle` text ≥ 4.5:1;
   - the result is injected as CSS variables on the menu root (`--brand-*`, `--brand-on`, `--brand-text`);
   - property-based tests over random colours check that AA always holds.
4. **Photo-less design (F4):** the menu layout adapts per category:
   - **≥ 50 % photos** → card grid/list with images;
   - **< 50 %** → elegant typographic list (name, description, dotted leader or aligned price, badges).

   A photo-less product inside a photo category shows a branded monogram tile, not a grey placeholder. The demo seed includes both kinds of categories.

5. **Theme:** the restaurant sets light / dark / auto for its menu (§6.5). "Auto" follows the phone. The back-office and staff app follow the user's preference via next-themes.
6. **Screenshot validation** in the Definition of Done:
   - Playwright projects at 360, 390, 430, 768, 1024, 1280, 1440;
   - routine task screenshots at 390 / 768 / 1440 × light/dark × FR/AR, saved to `e2e/__screenshots__/` as visual-regression baselines;
   - automated checks per screen: no horizontal scroll, no overflow, touch-target sizes, axe with zero serious or critical violations.
7. **Charts:** shadcn charts on Recharts v3 (T9), themed with tokens.
8. **Fonts:** self-hosted variable fonts, subset to Latin + Latin-ext and Arabic, preloaded (only the active script), `font-display: swap`, size-adjusted fallbacks to avoid CLS. The final families come with the chosen direction, among Inter / Geist for Latin and IBM Plex Sans Arabic / Cairo for Arabic, as the spec says.

## Consequences

- Design quality is gated by evidence (screenshots and automated checks) and by a brand system that can't produce an inaccessible menu.

## Amendment — 2026-10-12 (P0-06)

The first prototype darkened pale brand colours (saffron turned mustard) because the button fill itself had to reach 3:1 against the page. WCAG 1.4.11 does not require that for a component identified by its text label. The fill now keeps the owner's colour and a separate `accent` shade carries the 3:1 non-text contrast. A light/dark surface inversion bug was fixed at the same time. Both are covered by tests in `src/lib/theme/brand.test.ts`, including a 2,000-colour property test.
