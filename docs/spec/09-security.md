# 09 — Security, anti-abuse, compliance

> Domain spec. Source: original spec §12, amended by ADR-0003, 0005, 0008, 0010, 0011, 0017, 0018, 0024, 0028. ADRs win on conflict.

The main risk is fraudulent ordering: from outside the venue, or for another table. The defence combines random tokens, signed sessions, rate limits and human validation.

## QR codes and sessions (ADR-0011, 0012)

- QR = `/t/{token}`: 128-bit random token, never the table number or any guessable id.
- GET never creates state. The first meaningful action opens the table session and sets a signed `__Host-` client cookie (HttpOnly, Secure, SameSite=Lax) bound to table session and device.
- Table session closes after 90 min of inactivity (configurable) or on bill closure. The client cookie lasts at most 3 h. Ordering requires a valid client session.
- The manager can regenerate a QR at any time. The old token dies immediately.

## Anti-abuse

| Threat                | Countermeasure                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordering from outside | Time-bound sessions; staff validation **on by default**; auto-accept only after the session's first order was accepted by staff; opening hours           |
| Order spam            | Per client session 1 / 15 s and 20 / h; per table session 40 / h; max 30 lines × qty 20                                                                  |
| Waiter-call spam      | 1 / 60 s per table session (same for bill requests)                                                                                                      |
| Price tampering       | Server recomputes totals from DB prices; client values ignored                                                                                           |
| Bots                  | Per-IP limits (Upstash, generous because cafés share IPs); invisible Cloudflare Turnstile only when the anomaly heuristic fires; GET is side-effect free |
| Ghost order accepted  | Staff sees the device's history; block device for 24 h                                                                                                   |
| Realtime spoofing     | Private channels, no client INSERT policy; only DB triggers publish (ADR-0008)                                                                           |
| IDOR on orders        | Order must belong to the cookie's table session                                                                                                          |

## Authentication (ADR-0010)

- Supabase Auth: email + password (≥ 10 characters, leaked-password protection on Pro), magic link, optional Google sign-in for owners.
- TOTP 2FA: **mandatory for Super Admin and Support** (restrictive RLS on `aal2`), offered to owners.
- Staff:
  - paired devices (hashed 256-bit device token in a `__Host-` cookie);
  - name + 4-digit PIN verified by HMAC-SHA256 with a server pepper;
  - lockout 5 failures / 5 min per device+membership, and 20 / h per device.
  - PIN strength relies on device binding plus online throttling. This is stated explicitly.
- Sessions: fixed devices until end of business day; mobile 12 h. Remote revocation.

## Application security

- **RLS on 100 % of tables**, checked in CI. Isolation tests per table and role (pgTAP + Vitest).
- Supabase **secret key server-only**, imported only in `src/server/admin/`. New publishable/secret keys; legacy keys disabled (ADR-0024).
- **Headers:**
  - CSP per surface: no-nonce allow-list on cached public pages; nonce + `strict-dynamic` on authenticated apps (ADR-0017);
  - HSTS, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, frame denial (except same-origin preview).
- **Uploads:** JPEG/PNG/WebP only (magic-byte check), ≤ 5 MB, ≤ 6000 px, re-encoded server-side, EXIF stripped, content-hashed paths (ADR-0018).
- No `dangerouslySetInnerHTML` (lint rule). User content is always rendered as text.
- Dependencies: Dependabot + `pnpm audit` in CI. `minimumReleaseAge` 14 days (security patches excepted).
- Secrets only in env stores. `.env.example` documents them. Validated at boot.
- OWASP Top 10 and **ASVS level 1** as the review checklist (`docs/spec/11-quality.md`).
- Every sensitive action audited (see 01-roles-permissions).
- Cron endpoints: bearer secret from Supabase Vault, constant-time compare.
- Idempotency keys on every public and staff mutation.

## Personal data and compliance (ADR-0028)

- Customers are never asked for name, phone or email. No customer data is sent to AI providers.
- Staff and owner data falls under Tunisian law 2004-63. **INPDP declaration and transfer-abroad authorisation to be checked with a lawyer** (EU hosting).
- Public pages: legal notice, terms of use and sale, privacy policy (placeholders until legal review).
- Daily backups kept 30 days (Supabase Pro), **monthly restore test** (runbook in `docs/setup.md` § Operations, Phase 1 end).
- Tenant data export on request (Phase 3). Hard deletion 90 days after cancellation (cron).
- Product analytics: server-side events; cookieless client analytics only on back-office and marketing (ADR-0020).
