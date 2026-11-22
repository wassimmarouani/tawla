# Taply menu templates — uniqueness MATRIX (brief §6.2)

The design contract that keeps the 10 templates genuinely distinct. **Rule: no two templates may
share the same choice on more than 2 of axes 2–10.** Check this file before building each template.
Shared code is allowed only in the headless engine + invisible primitives (brief §6.1). Venue-type
pairs (2 cafés, 2 Italian, 2 pâtisseries, 2 bars) are built as deliberate opposites.

Method: ui-ux-pro-max SKILL.md priorities per template (the `search.py` engine is not installed; see
`../AUDIT.md`). Each template also gets its own doc in `design-system/pages/template-<slug>.md`.
Type uses the brief's Google-Fonts Arabic shortlist; ≤2 families + Arabic per template, subset.

## Axis grid (2–10)

| #   | Template                                | 2 Archetype                                    | 3 Navigation                                       | 4 Card anatomy                                                | 5 Detail                              | 6 Type (Latin / Arabic)                | 7 Palette · mode                                     | 8 Imagery                              | 9 Ornament                            | 10 Motion · voice                          |
| --- | --------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------- | -------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------ |
| 1   | **Café El Bahja** (trad. café)          | Arched category "doors" home → compact rows    | Doors → drill-in (2-tap); "Incontournables" shelf  | Compact row, small round thumb, dotted price leader           | Bottom sheet                          | Fraunces / **Reem Kufi**, Arabic-led   | Terracotta·green·brass·cream · light+warm-dark       | Small round framed thumbs              | Zellige geometry, arches              | Warm & slow · hospitable/traditional       |
| 2   | **Café Marina** (specialty)             | Bento grid, mixed sizes                        | Sticky diet-filter bar + category tabs             | Bento card, square photo top, diet icons, price bottom        | Bottom sheet + ingredient breakdown   | Geist / **IBM Plex Sans Arabic**       | Sea-salt·sage·sand·ink · light                       | Framed square photos                   | Hairline grid, coastal dot            | Crisp & quick · clean/health-forward       |
| 3   | **Pizzeria Mediterranea** (wood-fired)  | Full-bleed photo feed (1-col)                  | Continuous scroll + floating category jump         | Full-bleed photo card, inline **size selector**, price/size   | Full page w/ sizes                    | Archivo condensed / **Cairo**          | Tomato·basil·flour cream · light                     | Full-bleed photography                 | Checkered tablecloth motif            | Playful bounce · appetite/casual           |
| 4   | **Trattoria Vesuvio** (upscale Italian) | Printed-carte editorial, courses = chapters    | Chapter anchors / table of contents                | Text line, name + **pairing** line, price right, **no photo** | Quiet inline expand                   | Cormorant + small caps / **Amiri**     | Ivory·oxblood·charcoal·gold · light+refined-dark     | None by default (typographic)          | Gold hairlines, small-caps rules      | Minimal/restrained · refined/sommelier     |
| 5   | **Pâtisserie La Rose** (TN pastry/tea)  | Two-column "vitrine" photo grid                | Category pills + **unit toggle** (pièce/kg/box)    | Photo tile, price with **unit badge**                         | Bottom sheet + unit/box               | Gilda soft-serif / **Tajawal**         | Rose·pistachio·cream·gold · light                    | Framed vitrine tiles                   | Calligraphic floral ornaments         | Soft fades · sweet/boutique                |
| 6   | **Pâtisserie Nordique** (French fine)   | Single-column lookbook                         | Vertical scroll + minimal top index                | One large image/item, asymmetric caption, allergen line       | Full detail page (composition/layers) | Neue-grotesk thin / **Alexandria**     | Cool monochrome + 1 berry · light, max white         | One large editorial image/item         | None; thin rule, whitespace           | Calm long fades · craft/editorial          |
| 7   | **Bar Citadelle** (cocktail, night)     | Dark filter-first list                         | **Filter by flavor profile** (taste chips) → list  | Dark card, **flavor scale bars** (sweet/sour/bitter/strong)   | Bottom sheet + profile + AF flag      | Deco display / **Reem Kufi**           | Navy·black·amber·brass · **dark default**            | Illustrated/minimal (no photo)         | Art-deco rays, amber glow             | Slow glows · moody/nocturne                |
| 8   | **Rooftop Sidi Bou** (terrace, mezze)   | Immersive full-height view hero + glass sheets | "À partager" grouping + hours banner; section rail | Glass card over image, "à partager" tag, serves-N             | Glass sheet over the view             | Mulish / **Baloo Bhaijaan 2**          | Sidi Bou blue·whitewash·bougainvillea · bright light | Full-height immersive + glass          | Whitewash arches, bougainvillea sprig | Parallax drift · breezy/sunset             |
| 9   | **Tunis Grill** (street food)           | Numbered price-first list + combo cards        | Numbered jump + **sticky bottom action bar**       | Number tab (#12), price-first big, combo badge                | Inline expand + combo                 | Anton heavy-condensed / **Cairo bold** | Charcoal·mustard·harissa red · high-contrast         | Cutout product on colour block         | Brutalist blocks, number tags         | Snappy/instant · punchy/street             |
| 10  | **Glacier Sorbetto** (ice cream)        | Flavor **swatch grid**                         | Swatch grid → **scoop builder** flow               | Colour chip + name + scoop-add button                         | Bottom sheet scoop builder            | Baloo 2 / **Baloo Bhaijaan 2**         | Soft clay pastels · light                            | Illustrated colour swatches (no photo) | Bouncy blobs, pastel confetti         | Springy (reduced-motion safe) · fun/family |

## Uniqueness check (pairs that could collide)

- **Cafés (1 vs 2):** doors/warm/Arabic-led/round-thumb vs bento/airy/geometric/square — 0 shared. ✓
- **Italian (3 vs 4):** photo-feed/red/full-bleed/bounce vs editorial/ivory/no-photo/restrained — 0 shared. ✓
- **Pâtisseries (5 vs 6):** vitrine/rose/calligraphic/tiles vs lookbook/monochrome/thin/large-image — 0 shared. ✓
- **Bars (7 vs 8):** dark/navy/flavor-list/glow vs bright/blue/immersive/parallax — 0 shared. ✓
- **Detail presentation** reuses a small set (sheet ×4, full-page ×2, inline-expand ×2, glass ×1,
  builder ×1). Any two that share "bottom sheet" differ on every other axis, so each pair stays ≤2
  shared. ✓
- **Arabic families** repeat across non-paired templates (Cairo 3/9, Reem Kufi 1/7, Baloo Bhaijaan
  8/10) but with different Latin partner + weight + layout — not a shared "choice" on the full axis.

## Data-dependent features → migration plan, await approval (brief §6.3)

These five template features need optional schema fields the current model can't express. **Do not
fake them.** Until approved, the template **degrades gracefully** (feature hidden, layout intact):

| Feature                        | Template     | Proposed optional field (migration draft)                                                |
| ------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| Flavor profile scale           | Citadelle    | `products.flavor jsonb` {sweet,sour,bitter,strong 0–5} + `alcohol_free bool`             |
| Price unit                     | La Rose      | `products.price_unit text` enum(piece,kg,box) default piece                              |
| Wine/tea pairing line          | Vesuvio      | `products.pairing jsonb` (i18n text)                                                     |
| Size selector / price-per-size | Mediterranea | reuse existing option groups, or `products.sizes jsonb` [{label,price}]                  |
| Scoop builder                  | Sorbetto     | derive from existing option groups (scoops as options) — no new field if options suffice |

Each would be its own migration + RLS tests + Zod + ADR, proposed separately for approval before
building. The scoop builder and size selector may be expressible with the **existing option-group
model** (`option_groups`, `product_option_groups`) — to confirm during Phase 4 engine work.

## Imagery rule (brief §6.2)

Within a menu, no photo is used for >1 item; no demo photo reused across templates or on the landing.
No suitable unique photo → the template's **designed no-photo fallback** (typographic/illustrated),
never a duplicate. Update `/legal/credits` per template. (Current `demo-photos.ts` already uses a
verified hero allowlist + typographic fallback — extend per template.)
