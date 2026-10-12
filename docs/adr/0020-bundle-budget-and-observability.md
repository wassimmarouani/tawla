# ADR-0020 — Customer-menu JS budget and observability loading strategy

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T6, spec §14.1, §15.5

## Context

The customer menu must ship < 150 KB of compressed initial JS, LCP < 2 s on 4G, and Lighthouse mobile ≥ 90. The React + Next runtime alone takes a large share of that budget. Sentry's browser SDK (≈ 25 KB+) and posthog-js (≈ 50 KB+) would break it.

## Decision

1. **Customer menu client code:**
   - RSC for everything static;
   - client islands only for interactions: category bar, product sheet, cart, search, language switcher;
   - Zustand (cart);
   - Motion through `LazyMotion` + `m`, with `domAnimation` features loaded asynchronously;
   - `@supabase/realtime-js` dynamically imported only when a channel is needed (ADR-0008);
   - fuzzy search dynamically imported on search focus.

   **No TanStack Query and no Supabase client** in the initial customer bundle.

2. **Budgets enforced in CI** with `size-limit` against the production build:
   - customer menu route ≤ **150 KB** gz total initial JS;
   - staff app ≤ 250 KB;
   - back-office ≤ 350 KB;
   - CSS ≤ 30 KB.

   Lighthouse CI (mobile, simulated 4G) runs on preview deploys for `/t/[token]` with the demo café and on the landing page, and fails under 90.

3. **Errors:**
   - server-side Sentry everywhere;
   - client-side, the customer menu loads a **minimal Sentry setup lazily after `requestIdleCallback`** (errors only, no tracing or replay);
   - staff, back-office and admin load the full SDK;
   - source maps uploaded in CI.
4. **Product analytics:**
   - the funnel events (`menu_viewed`, `item_added`, `order_sent`) are captured **server-side** with posthog-node from the route handlers;
   - client-side `posthog-js` loads only on back-office and marketing, deferred, in **cookieless/memory persistence** mode;
   - customers are never fingerprinted;
   - ingest goes through our own `/ingest` rewrite (CSP-friendly, ad-block resilient).
5. **Structured logs** (JSON) with `request_id` and `restaurant_id` via a tiny logger in `src/lib/log.ts`.
6. Uptime: an external probe every minute on `/t/{demo-token}` and `/api/health`, plus a public status page (Phase 1 end).

## Consequences

- The budget is protected automatically. Regressions fail the PR, not production.
