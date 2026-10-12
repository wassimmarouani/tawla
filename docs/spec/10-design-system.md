# 10 — Design system, UX/UI, visual identity

> Domain spec. Source: original spec §13, §14.3, amended by ADR-0021, 0026, 0027. ADRs win on conflict.
> **Visual direction: ADR-0029 "Tawla"** (A's calm header and surfaces, B's menu-card lists, C's food grid). Its table is the source for `src/styles/tokens.css`.

Target: native-app quality. Calm, fast, animated with restraint, customisable with each venue's colours without ever breaking legibility. Premium 2026 product, not a template.

## Art direction per surface

| Surface       | Intent                                                                                                                                                                          | References                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Customer menu | **Appetite-first.** Photos carry emotion, the UI steps back. Large images, generous radii, crisp type, lots of space. **Equally premium with zero photos** (typographic layout) | Airbnb, Uber Eats              |
| Staff app     | **Glanceable.** Readable from 1 m (stations 2 m), XXL table numbers, bold status colours, ≥ 48 px targets, one-handed, zero decoration                                          | Modern kitchen display systems |
| Back-office   | **Calm productivity.** Bento dashboard, inline editing, live mobile preview, Cmd/Ctrl+K                                                                                         | Linear                         |
| Landing       | Modern and premium. Interactive demo: a real menu to scan from the screen                                                                                                       | —                              |

## Process (ADR-0027)

1. **P0-06:** three visual directions (palette, Latin + Arabic type pairing, component style). Each is rendered on the same customer menu screen at 390 px in light/dark × FR/AR × photos/no-photos × two tenant brand colours. The owner picks one → ADR-0029.
2. Tokens first, then shadcn (Base UI) components restyled on tokens.
3. Each screen is validated by Playwright screenshots and automated layout and accessibility checks before it counts as done.

## Tokens (`src/styles/tokens.ts` → generated `tokens.css`, Tailwind v4 `@theme`)

Source of truth: `src/styles/tokens.ts`. `pnpm tokens:build` renders `tokens.css`, emitting dark values for both `[data-theme=dark]` and `prefers-color-scheme: dark` (zero-JS "auto" mode; `light-dark()` is avoided because it breaks iOS < 17.5). `src/styles/tokens.test.ts` checks 24 contrast pairs in both themes and that the CSS is up to date. Names follow shadcn/ui (`background`, `card`, `muted`, `primary`…) plus `brand-*` roles. The dev gallery `/dev/design-system/{light|dark}` shows every token, component and state.

| Token group      | Values                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Spacing          | 4 px grid: 0, 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64), 20 (80)                         |
| Radii            | `sm` 8 (buttons, inputs), `md` 16 (cards), `lg` 24 (sheets), `full`                                                            |
| Type scale       | 12 / 14 / 16 / 18 / 24 / 32 / 40 + **display 56 / 72 / 96** (staff); line heights per step; sizes in rem                       |
| Fonts            | **Geist** (Latin) + **IBM Plex Sans Arabic** (ADR-0029). Self-hosted, subset, `swap`, metric-matched fallbacks                 |
| Colour: neutrals | 50–950 OKLCH scale, separate light/dark mappings                                                                               |
| Colour: brand    | `--brand-50…950` generated in OKLCH from the tenant colour (`generateBrandScale`)                                              |
| Colour: semantic | success, warning, danger, info, each 50–950; status colours for order states (always paired with icon + label)                 |
| Semantic aliases | `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--border`, `--ring`, `--brand-solid`, `--brand-on`, `--brand-text` |
| Shadows          | 3 soft levels (`sm`, `md`, `lg`), dark-mode variants                                                                           |
| Motion           | `--duration-micro` 150 ms, `--duration-base` 250 ms, `--ease-out` (cubic-bezier(0.16, 1, 0.3, 1)); none under reduced motion   |
| Z-index          | base, sticky, overlay, sheet, toast                                                                                            |
| Targets          | `--target-min` 44 px (customer, back-office), `--target-staff` 48 px                                                           |

**Rules:** components use tokens only. No hex values, no arbitrary Tailwind values (`[13px]`, `[#abc]`) outside `tokens.css` (lint rule). Physical direction utilities are banned; use logical ones (`ms-`, `pe-`, `start-`).

## Tenant brand theming (ADR-0027)

- `generateBrandScale(hex)` → OKLCH 50–950.
- `resolveBrandTheme(colour, surface)` resolves the roles used on each surface (light and dark): `solid` keeps the owner's exact colour as the button fill whenever a label reaches 4.5:1 on it (ink or paper text); `text` ≥ 4.5:1 and `accent` (active tabs, borders) ≥ 3:1 against the surface; `subtle` tint with `onSubtle` text ≥ 4.5:1. Implemented in `src/lib/theme/brand.ts`.
- If the chosen colour is too light or too dark, the text and solid variants are shifted automatically. The owner sees a preview and a note.
- Property-based tests: random colours × surfaces always meet AA.

## Key components

| Component                                | Surface     | Expected behaviour                                                                                                    |
| ---------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Sticky category bar                      | Customer    | Horizontal scroll, active category follows scroll, snaps, RTL-aware                                                   |
| Product card                             | Customer    | List / grid variants, photo or monogram, unavailable state, badges, "from" price                                      |
| Product sheet                            | Customer    | Bottom sheet (Base UI Drawer + Motion), drag to close, snap points, live option validation, price updates, URL-synced |
| Floating cart button                     | Customer    | Animated counter, total, hidden when empty, safe-area aware                                                           |
| Order tracker                            | Customer    | Step progress with timestamps (Phase 2)                                                                               |
| Service request buttons                  | Customer    | Call waiter / bill with cooldown countdown and confirmation                                                           |
| Request / order card                     | Staff       | XXL table number, coloured timer + icon, swipe or button actions, optimistic with rollback                            |
| Floor plan                               | Staff       | Grid of tables, colour + icon state (Phase 2)                                                                         |
| Connection indicator                     | Staff       | Green / orange / red + label                                                                                          |
| Menu editor                              | Back-office | Drag and drop, inline edit, live mobile preview iframe                                                                |
| Stat tiles                               | Back-office | Value, change, sparkline (Phase 3)                                                                                    |
| Empty / loading / error / offline states | All         | Illustrated, helpful next action; skeletons with final dimensions                                                     |

## Interaction and motion

- Add to cart: item thumbnail flies to the cart button; haptic `vibrate(10)` where supported.
- View Transitions (React `<ViewTransition>`) between menu and product, and between tabs.
- Bottom sheets draggable with velocity. Durations 150–250 ms, ease-out. **Never block an action.**
- `prefers-reduced-motion`: replace movement with opacity, or nothing.
- Avoid: heavy glassmorphism, loud gradients, long animations.

## UX principles

- ≤ 3 taps from scan to first item in the cart.
- No blocking dialogs on the customer menu. Errors inline, with the fix.
- Destructive back-office actions: undo toast for 5 s instead of confirmation dialogs (except irreversible ones like QR regeneration and device revocation, which use a clear confirm).
- Useful empty states with the next action.
- Short, warm copy, proofread in FR/AR/EN by native speakers. All strings in `src/messages/`.

## Responsiveness (non-negotiable)

Flawless at **360, 390, 430, 768, 1024, 1280, 1440 px**:

- no horizontal scroll, no overflowing or truncated text, no overlaps;
- touch targets ≥ 44 px (≥ 48 px staff);
- safe-area insets respected; `dvh` for full-height layouts.

## Accessibility (WCAG 2.2 AA)

- Full keyboard navigation, visible focus (`--ring`), ARIA labels on icon buttons.
- Product photo alt text defaults to the product name.
- Zoom to 200 % without loss; text sizes in rem.
- **Never colour alone:** every status has an icon and a label.
- axe-core in Playwright: zero serious or critical violations.
