# ADR-0022 — Own service worker built with esbuild on `serwist` core

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T11, spec §5.7, §9.1, §14.2

## Context

- `@serwist/next` is documented as "meant for webpack". Next 16 builds with Turbopack by default, and a custom webpack config fails the build.
- `@serwist/turbopack` is the official Turbopack path (worker served from a route handler, compiled with esbuild). It has open issues, including #360: `createSerwistRoute` fails with `ERR_MODULE_NOT_FOUND` on Vercel.
- Phase 1 needs a service worker for **Web Push** on staff devices and for **offline viewing** of the customer menu. Neither needs a precache of hashed build chunks.

## Decision

1. `src/sw/staff-sw.ts` and `src/sw/menu-sw.ts` are written with **`serwist` core** (runtime caching strategies, no Next plugin). `scripts/build-sw.ts` bundles them with **esbuild** into `public/sw-staff.js` and `public/sw-menu.js`, before `next build` and in watch mode during `next dev`.
2. **Scopes:**
   - `/staff/` (push, notification click → focus or open, offline shell);
   - `/t/` and slug menus (stale-while-revalidate for menu HTML, cache-first for `media/` images and fonts).

   **Ordering is never served from cache.** Offline, the cart is kept locally and sending is disabled with a clear message.

3. **Web Push:**
   - VAPID keys in env;
   - `push_subscriptions (restaurant_id, membership_id, device_id, endpoint, keys, created_at)`;
   - sent with `web-push` from `src/server/admin/push.ts`;
   - subscriptions deleted on 404/410.
4. Manifests: separate web app manifests for staff (`display: standalone`, staff icon) and the menu (optional install). iOS onboarding explains "Add to Home Screen" (push requires it on iOS ≥ 16.4; Wake Lock works in home-screen apps from iOS 18.4).
5. Re-evaluate `@serwist/turbopack` once #360 is resolved, if we ever need a precache manifest.

## Consequences

- No dependency on a plugin with open Vercel bugs. Full control of push and caching. Runtime caching only (no build precache), which fits our needs.

## Sources

- https://serwist.pages.dev/docs/next/getting-started · https://serwist.pages.dev/docs/next/turbo
- https://github.com/serwist/serwist/issues/360
- https://bugs.webkit.org/show_bug.cgi?id=254545 (Wake Lock in home-screen web apps, iOS 18.4)
- https://github.com/mdn/browser-compat-data/blob/main/api/PushManager.json
