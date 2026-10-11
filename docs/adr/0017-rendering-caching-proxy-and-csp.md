# ADR-0017 — Rendering, caching, `proxy.ts` and Content-Security-Policy

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T1, E8, spec §9.2, §12.4, §14.2

## Context

- Next 16 renamed `middleware.ts` to `proxy.ts` (Node runtime only).
- Cache Components (`cacheComponents: true`, with `partialPrefetching: true` in 16.4) is stable, with `'use cache'`, `cacheTag`, `cacheLife`, `revalidateTag(tag, profile)` and `updateTag(tag)` (Server Actions only).
- Turbopack is the default for dev and build.
- Next docs: **nonce-based CSP requires dynamic rendering for every page**, which disables static and ISR caching and is incompatible with PPR. `experimental.sri` adds hashes to external scripts only.

## Decision

1. **`proxy.ts` does only cheap work:**
   - next-intl locale negotiation for platform routes;
   - Supabase auth cookie refresh for `/dashboard`, `/staff`, `/admin`;
   - security headers.

   **No DB queries in the proxy.** The tenant is resolved in RSC via a `cache()`-wrapped loader (`getRestaurantBySlug`, `getTableByToken`) and passed explicitly to services.
2. **Customer menu caching:**
   - `cacheComponents: true`;
   - the menu data loader is `'use cache'` + `cacheTag('menu:' + restaurantId)` + `cacheLife('max')`;
   - menu mutations call `revalidateTag('menu:' + id, 'max')` (route handlers) or `updateTag` (Server Actions);
   - availability changes also revalidate this tag **and** broadcast (ADR-0008);
   - per-request bits (client session, table) are rendered in dynamic holes.
3. **CSP per surface:**
   - **Public, cached surfaces** (customer menu, marketing): CSP without nonces. `script-src 'self' 'unsafe-inline'` + allow-listed hosts (Supabase, Turnstile, Sentry and PostHog ingest via our own proxy path). `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`.
     - Why `'unsafe-inline'`: App Router inlines RSC payload scripts, and without nonces they need it. Mitigations: no `dangerouslySetInnerHTML` (lint rule), all user content rendered as text, Trusted Types report-only. `experimental.sri` enabled for external scripts once verified in P0.
   - **Authenticated surfaces** (`/dashboard`, `/staff`, `/admin`): already dynamic, so a **nonce-based strict CSP** is set in `proxy.ts` (`'nonce-…' 'strict-dynamic'`).
   - All surfaces: HSTS (preload after launch), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera only on pages that need it), `X-Content-Type-Options: nosniff`. `X-Frame-Options: DENY` except the live preview iframe route (`SAMEORIGIN`).
4. **View Transitions:** React 19.3 `<ViewTransition>` (stable, no config) for menu ↔ product and tab transitions, disabled under `prefers-reduced-motion`.
5. Vercel functions are pinned to region **`cdg1`** (ADR-0024).

## Consequences

- The menu stays CDN/edge-cached and LCP-friendly. Authenticated apps get the strictest CSP.
- The public CSP is weaker on inline scripts. This is a documented, mitigated trade-off, revisited if Next ships hash-based CSP for RSC payloads.

## Sources

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag · https://nextjs.org/docs/app/api-reference/functions/updateTag
- https://nextjs.org/docs/app/guides/content-security-policy
- https://nextjs.org/docs/app/guides/view-transitions
