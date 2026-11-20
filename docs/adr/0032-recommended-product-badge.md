# ADR-0032 — "Recommended" product badge (Coup de cœur)

Status: accepted (2026-11-20)

## Context

Owners want to highlight their signature dishes so guests see them first — a common
merchandising lever for cafés and restaurants. The menu already has a `products.badges text[]`
set (`new`, `popular`, `house`, `seasonal`), wired end-to-end: editor chips, the public-menu Zod
schema, card/row rendering, and filter tags. The "Méditerranée moderne" design system already
reserves the **Jasmin** gold for a "Recommandé" marker, but nothing produced it yet.

## Decision

Add a `recommended` value to the product badges set rather than a new column or table.

- **Schema:** widen the `products_badges_check` constraint to include `recommended`
  (migration `20261120090000_add_recommended_product_badge.sql`). No new column, no RLS change —
  `products` is already tenant-scoped with RLS and tests; the constraint is a value-set widening.
- **Source of truth:** `BADGES` in `src/lib/menu/attributes.ts` gains `recommended` (listed first,
  so it leads the editor chips and reads as the primary marker).
- **Rendering:** the public menu renders `recommended` with the Jasmin badge (`bg-highlight-jasmin`)
  and a heart glyph — never colour alone. Jasmin becomes exclusive to `recommended`; `popular` moves
  to a brand-subtle chip so the gold signals one thing.
- **Discovery:** `recommended` joins `MENU_FILTERS`, giving guests a "Recommandé" filter chip that
  reuses the existing client-side filtering (works across all seven menu variants, RTL and search) —
  no separate, duplicated "Nos recommandations" shelf to maintain.

## Consequences

- An owner marks a dish with one chip; it gains the gold badge and is filterable. Basic plan, no
  entitlement gate (pure merchandising).
- No data migration of existing rows (default `'{}'` unchanged).
- Later tiers can layer data-driven recommendations (popularity from orders, AI pairings) on top of
  this manual flag; those remain separate, order-data features (see `docs/redesign/backlog.md`).
- `popular` loses the Jasmin colour; this is intentional (design system: Jasmin = Recommandé).
