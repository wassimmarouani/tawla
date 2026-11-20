# Redesign backlog (deferred, not yet scheduled)

Items found during the "Méditerranée moderne" redesign that are worth doing but are
**out of the current phase scope**. Each needs its own small PR.

## P1 — resilience + a11y (visual layer; safe on the redesign branch)

- **Route-group `error.tsx`** — only `/dashboard` has one. Marketing, console (`/admin`) and the
  public menu have no error boundary, so a render error or a DB outage falls through to Next's raw,
  untranslated crash page. Add a translated `ErrorState` (with retry) per group.
- **Route-group `loading.tsx` / Suspense skeletons** — console `<Suspense>` boundaries have no
  fallback (layout jank on first paint). Add `StatCard loading` + a table skeleton.
- **Harissa accent is unused in product code** — the palette's coral is meant for
  attention/promotions. Put it to work: out-of-stock / rupture state, promo badges, quota-near-limit
  warnings.

## P2 — consistency

- **`PriceTag` everywhere** — console and menu still render money with raw `formatMoney`. Migrate to
  `PriceTag` / `formatTND(context)` for one money surface.
- **Reduced-motion audit** — the landing has ~7 animated decorations (aurora drift, marquee, float);
  confirm every one is disabled under `prefers-reduced-motion`.
- **Secondary empties → `EmptyState`** — e.g. the venue-detail "AI by month" sub-table still uses a
  plain `<p>`.

## P3 — handled by Phase 3 QA

axe (zero serious/critical), Lighthouse budgets, a `/dev/design-system` visual snapshot, a dark-mode
pass, and 375 px / 200 % zoom checks.
