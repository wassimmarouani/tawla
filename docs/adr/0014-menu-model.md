# ADR-0014 — Menu model: option groups with per-product overrides, typed schedules, price rounding, stations

- Status: Accepted
- Date: 2026-10-11
- Audit refs: C7, C8, C9, C12, spec §4.3, §6.2, §6.5

## Context

- `option_groups.is_required` duplicates `min_select ≥ 1`.
- Reusable groups (e.g. "Size") need per-product price deltas: Large is +1.500 on a coffee but +2.000 on a juice.
- Category time windows have no days of the week. Opening hours don't handle overnight ranges, exceptional closures or a "close now" switch.
- Bulk "+10 %" price changes have no rounding rule.
- Stations are fixed in the spec, but each restaurant defines its own.

## Decision

1. **Option groups:**
   - columns: `min_select int ≥ 0`, `max_select int ≥ min_select`;
   - "required" is **derived** (`min_select > 0`);
   - single choice ≡ `max_select = 1`.
2. **`product_option_groups`** carries optional overrides: `min_select`, `max_select`, and a jsonb `price_overrides { optionId: millimes }`. The effective rules come from a pure function `effectiveOptionGroup(group, link)`, unit-tested.
3. **Option quantities** (2× cheese) are out of scope for v1. Each option is selected at most once.
4. **Schedules:** one Zod-validated jsonb format, `Schedule`, reused for opening hours, category availability and (Phase 3) happy hour.
   ```ts
   type Schedule = {
     weekly: { day: 1 | 2 | 3 | 4 | 5 | 6 | 7; ranges: Range[] }[]; // ISO weekday
     exceptions: ({ date: string; closed: true } | { date: string; ranges: Range[] })[]; // date = YYYY-MM-DD
   };
   type Range = { from: string; to: string }; // 'HH:MM'; to <= from means overnight
   ```
   Plus `restaurants.manual_status: 'auto' | 'open' | 'closed'` with `manual_status_until` (the "close now" switch). `isOpenAt(schedule, manual, instant, tz)` is a pure, heavily tested function.
5. **Price rounding for bulk changes:** round half up to the nearest `price_rounding_step` millimes (default **100** = 0.100 DT; options 10, 50, 100, 500, 1000). Pure function `applyPercentage(price, pct, step)`. The bulk dialog previews old and new prices before applying. Every change writes `price_history` (trigger) and an audit log.
6. **Stations:**
   - Phase 1: `products.station_id uuid null`, no UI;
   - Phase 3: a `stations (restaurant_id, name jsonb, sort_order)` table per restaurant, defaults seeded from the restaurant type (Bar, Cuisine, Pâtisserie).
7. **Display price:** a product whose required single-choice group has price deltas shows "à partir de / from / ابتداءً من" + the minimum effective price.

## Consequences

- No duplicate groups just to vary a price. One schedule engine for every time-based rule.
