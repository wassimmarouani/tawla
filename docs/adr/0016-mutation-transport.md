# ADR-0016 — Route Handlers for staff and public mutations, Server Actions for back-office forms

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T2, spec §11.3, §16.2 (offline staff mode)

## Context

- Next.js docs: new deployments typically generate new Server Action IDs (rotated at most every 14 days even when the source is unchanged). Stale clients get "Failed to find Server Action".
- Next.js dispatches Server Actions **one at a time per client**.
- The staff app needs optimistic UI, fast parallel taps and (later) an offline queue replayed after reconnect. A queue of Server Action calls breaks on the next deploy.

## Decision

1. **Staff app and public customer endpoints** use **Route Handlers** under `/api/staff/*` and `/api/public/*`:
   - stable REST-like contracts with Zod schemas in `src/features/*/schemas`;
   - idempotency keys on every mutation;
   - safe to retry and to queue offline.
2. **Back-office forms** (menu editor, settings, tables, staff) use **Server Actions** with `useActionState`. They are progressively enhanced and the user is online at a desk. They set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and handle the stale-action error with a "reload" toast.
3. Both paths call the same `services/` functions and permission checks. Transport is a thin adapter.
4. **Error contract** for both: `{ code, message, details? }`. Stable codes live in `src/lib/errors/codes.ts`: `TABLE_TOKEN_INVALID`, `PRODUCT_UNAVAILABLE`, `ORDERING_DISABLED`, `RATE_LIMITED`, `ORDER_STATE_CONFLICT`, `SESSION_EXPIRED`, `FORBIDDEN`, `VALIDATION_FAILED`, `PLAN_LIMIT_REACHED`, `AI_QUOTA_EXCEEDED`, …
5. **Idempotency:** table `idempotency_keys (restaurant_id, key, scope, response_hash, created_at)`, unique on `(restaurant_id, scope, key)`. A replayed key returns the stored result. Pruned after 24 h.

## Consequences

- Staff mutations survive deploys and can run in parallel and be queued.
- Two transport styles to keep consistent, with shared services and schemas.

## Sources

- https://nextjs.org/docs/app/guides/server-actions
- https://nextjs.org/docs/messages/failed-to-find-server-action
