# ADR-0013 — Business-day order numbers and row versions

- Status: Accepted
- Date: 2026-10-11
- Audit refs: C4, C5, spec §10.3, §11.5

## Context

- Order numbers are "sequential per restaurant per day". But cafés close at 02:00, and Ramadan shour service runs late, so "day" needs a definition.
- Realtime ordering needs a `version` on rows (§11.5), but the data model has none.

## Decision

1. **Business day:**
   - `business_date = (now() at time zone restaurant.timezone - restaurant.day_cutoff)::date`;
   - `day_cutoff` is an interval, default `05:00`, configurable;
   - implemented once in SQL (`public.business_date(restaurant_id)`) and once in TS (`services/business-day.ts`), with shared test vectors.
2. **Allocation:** table `order_counters (restaurant_id, business_date, last_number, primary key (restaurant_id, business_date))`:
   ```sql
   insert into order_counters values ($r, $d, 1)
   on conflict (restaurant_id, business_date)
   do update set last_number = order_counters.last_number + 1
   returning last_number;
   ```
   It runs in the order-creation transaction, so there are no gaps from concurrency (only from rolled-back transactions, which is acceptable). Displayed as `#047` (3 digits minimum).
3. `orders`, `order_items`, `service_requests` and `table_sessions` get `version integer not null default 1`, incremented by a `before update` trigger. Realtime payloads carry it.
4. Uniqueness: `unique (restaurant_id, business_date, number)` on `orders`.

## Consequences

- Numbers reset at the configured cutoff, not at midnight. Late-night service never shows `#001` again in the middle of the evening.
