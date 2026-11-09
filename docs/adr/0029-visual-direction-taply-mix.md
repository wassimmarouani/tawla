# ADR-0029 — Visual direction "Taply": A's calm, B's menu-card lists, C's food grid

- Status: Accepted
- Date: 2026-10-12
- Audit refs: Q5, F4, ADR-0027
- Decided by: product owner ("mix them, impeccable design"), composition by design lead

## Context

P0-06 explored three directions on the same customer menu (`docs/design/directions/`):

- A Jasmin: calm Mediterranean editorial;
- B Médina: bold menu card;
- C Souk: warm, tactile grid.

The owner asked for a mix, with the composition delegated. The mix ("M") was prototyped, reviewed and iterated, then captured in 16 variants: light/dark × FR/AR × with and without photos × two brand colours. All pass axe with zero serious violations, have no overflow and no console errors.

## Decision

The platform visual language is **M**. Each element comes from the direction that solves it best:

| Element                               | Source               | Specification                                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Palette                               | between A and C      | Warm neutrals. **Light:** paper `#f8f5ef`, surface `#ffffff`, surface-2 `#f1ece3`, ink `#1f1a14`, muted `#655d53`, line `#e6dfd3`. **Dark:** paper `#14110e`, surface `#1d1915`, surface-2 `#28231d`, ink `#f5f0e8`, muted `#ada497`, line `#342e27`. No pure black or white surfaces. |
| Typography                            | A                    | **Geist** (Latin) + **IBM Plex Sans Arabic**, self-hosted and subset via `next/font`. Titles 650 with −0.015 to −0.02 em tracking; body 400; names 600; prices 650 with tabular numerals.                                                                                              |
| Header                                | A                    | Cover 15 rem; venue card overlapping by 2.75 rem, radius 24 px, soft shadow; round 64 px logo with a 4 px surface ring; centred name; facts row (open status, Wi-Fi, info) under a hairline.                                                                                           |
| Header without photo                  | A + C                | 8.5 rem brand-tint band with a woven-dot texture (C) behind the same card.                                                                                                                                                                                                             |
| Controls on photos                    | A                    | Dark translucent pills (`rgb(20 17 14 / .6)` + blur) with white text; active language = white pill.                                                                                                                                                                                    |
| Search                                | A                    | Filled pill, surface-2.                                                                                                                                                                                                                                                                |
| Category navigation                   | A                    | Outline pills (44 px), active pill = brand solid.                                                                                                                                                                                                                                      |
| Section headings                      | B                    | Hairline rule, brand-coloured 2-digit index (`01`), title 22 px / 650.                                                                                                                                                                                                                 |
| Photo-less categories (< 50 % photos) | B                    | Printed menu-card list: grid row _name · dotted leader · price_; leader pinned to the last line of the name; description and badges below, stopping before the price column. No card container.                                                                                        |
| Photo categories (≥ 50 % photos)      | C, with A's surfaces | Auto-fill grid (min 160 px: 2 columns on phones), cards radius 20 px with 6 px inset media radius 14 px, soft shadow; name 2 lines, description 1 line; price in **ink** (not brand).                                                                                                  |
| Dish without photo                    | C                    | Brand tint + dot texture + first grapheme of the name (`Intl.Segmenter`, works for Arabic).                                                                                                                                                                                            |
| Badges                                | all                  | Pills: popular = brand tint, new = brand solid, spicy = semantic red tint.                                                                                                                                                                                                             |
| Unavailable                           | spec 02              | Greyed (muted text, greyscale image at 45 %) + "Indisponible" flag; never hidden.                                                                                                                                                                                                      |
| Service bar                           | A                    | Floating pill container (safe-area aware), ghost button + brand-solid button, 48 px.                                                                                                                                                                                                   |
| Brand usage                           | —                    | Brand colour only for actions, the active state, indexes, badges and the logo. Prices and text stay ink, so any tenant colour keeps the menu legible and calm.                                                                                                                         |
| Motion                                | ADR-0027             | 150 ms micro / 250 ms transitions, ease-out; nothing animated in this static spec.                                                                                                                                                                                                     |

Shape scale: 8 px (inputs, small controls), 14 px (media), 20 px (cards), 24 px (sheets, header card), full (pills).

## Consequences

- P0-07 turns this table into `src/styles/tokens.css` and restyles the shadcn/Base UI components on it. The prototype CSS (`src/app/[locale]/dev/directions/_styles/m-taply.css`) is the visual reference.
- Back-office and staff app reuse the palette, type and shape scale. Staff adds display sizes and bolder status colours (ADR-0027).
- Directions A, B and C stay in the repo as dev-only references until P1-07a ships the real customer menu, then they are deleted.
