# ADR-0012 — URL scheme: slug-free permanent QR URLs, locale outside customer paths, reserved slugs

- Status: Accepted
- Date: 2026-10-11
- Audit refs: F1, E7, spec §4, §9.2, §19.1

## Context

- The spec's QR URL `/{slug}/t/{token}` conflicts with the `app/[locale]/…` tree, which would produce `/fr/{slug}/t/…`.
- Printed QR codes must survive a slug rename and a language change.
- Shorter URLs mean less dense QR codes, which scan better on worn tents.
- Restaurant slugs can collide with app routes (`admin`, `staff`, `pricing`…).

## Decision

1. **QR codes encode `https://{APP_DOMAIN}/t/{token}`.**
   - The token is 128 bits of randomness, 22 chars base64url, and is globally unique, so no slug is needed.
   - "Regenerate QR" replaces the token, and the old one stops working at once.
2. **Customer routes have no locale prefix:**
   - `/t/{token}`: table menu, ordering per plan;
   - `/{slug}`: public read-only menu (general QR, social links, SEO canonical).

   Locale resolution: cookie `NEXT_LOCALE` (explicit choice) → restaurant-enabled locales matched against `Accept-Language` → restaurant default locale. `<html lang dir>` follows it.

3. **Marketing routes** use next-intl routing with `localePrefix: 'as-needed'` and default `fr`: `/`, `/pricing`, `/legal/*`, `/ar/…`, `/en/…`. Internally they live under `src/app/[locale]/(marketing)/` with `dynamicParams = false`.
4. **App routes have no locale prefix:** `/login`, `/signup`, `/dashboard`, `/staff`, `/admin`. UI locale = `profiles.locale`, mirrored to the `NEXT_LOCALE` cookie.
5. **Routing in `proxy.ts`, no DB access** (ADR-0017). The first path segment decides:
   - a locale code or a marketing path → next-intl middleware;
   - a reserved app segment (`t`, `r`, `api`, `dashboard`, `staff`, `admin`, `login`, `signup`, `_next`, static files) → pass through;
   - **anything else is a restaurant slug** → internal rewrite `/{slug}` → `/r/{slug}`. Unknown slugs render 404 from the page.

   Two dynamic root segments (`[locale]` and `[slug]`) would conflict in the App Router. This rewrite avoids it, and reserved slugs (below) guarantee no collision.

6. Customer pages (`/t/[token]`, `/r/[slug]`) resolve the locale themselves (cookie → restaurant locales × `Accept-Language` → default) and call `setRequestLocale`.
7. **Reserved slugs:** a list in `src/lib/tenancy/reserved-slugs.ts` covering:
   - every top-level route, plus `admin, api, app, staff, dashboard, t, p, pricing, login, signup, legal, help, support, status, www, mail, static, assets`;
   - locale codes and brand names.

   Enforced by Zod and by a DB check against `reserved_slugs`. Slug pattern: `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$`.

8. Slug renames keep `slug_redirects (old_slug → restaurant_id)` for 301s. QR codes are unaffected.
9. Subdomains and custom domains (Premium, Phase 4) are resolved in `proxy.ts` by mapping host to restaurant id. That's an additive change.

## Consequences

- Printed material is permanent. URLs are short, and SEO lives on `/{slug}`.
