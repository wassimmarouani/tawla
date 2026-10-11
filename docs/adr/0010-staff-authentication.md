# ADR-0010 — Staff authentication: shadow users, paired devices, "pick your name + PIN"

- Status: Accepted (session minting to be proven by spike P0-09)
- Date: 2026-10-11
- Audit refs: Q2, C3, E4, spec §5.1, §6.4, §12.3

## Context

- Waiters and counter staff often have no email address. They need a fast login (4-digit PIN) on a device the restaurant trusts.
- Supabase Auth requires a user record per identity and has no "create session" admin endpoint.
- Documented pattern: `auth.admin.generateLink({ type: 'magiclink', email })` returns `properties.hashed_token` without sending an email. Then `auth.verifyOtp({ token_hash, type: 'email' })` returns a real session (access + refresh token).
- Auth rejects reserved email domains (`.test`, `.local`, `example.com`, …). Use a subdomain we control.
- A 4-digit PIN has 10,000 combinations. Any hash (Argon2, bcrypt) falls to offline brute force in milliseconds. Real protection is device binding plus online lockout.

## Decision

1. **Owners and managers:** email + password (≥ 10 characters, leaked-password protection on Supabase Pro). Magic link and optional Google sign-in for owners. TOTP 2FA offered to owners, **mandatory for Super Admin and Support** (ADR-0005).
2. **Shadow users:** each `counter`/`waiter`/`station` membership without a personal email gets an `auth.users` record:
   - created with `admin.createUser({ email: 'm-<membershipId>@<STAFF_EMAIL_DOMAIN>', email_confirm: true })`;
   - the domain is a subdomain we control and never deliver to;
   - no password is set.

   A staff member with an existing account can link it instead.
3. **Paired devices.** Table `staff_devices`:
   - columns: `id, restaurant_id, label, mode ('fixed'|'mobile'), token_hash, created_by, last_seen_at, revoked_at`;
   - an owner or manager pairs a device from the back-office with a QR or 8-character code, valid 10 min;
   - the device gets a 256-bit token in an HttpOnly, Secure, SameSite=Strict cookie (`__Host-tawla_device`), stored only as a SHA-256 hash.
   - Revoking a device invalidates it immediately and ends every session started from it.
4. **PIN login:**
   1. The device cookie identifies the restaurant.
   2. The screen shows active staff (avatar + name).
   3. The person taps their name and enters the PIN.
   4. The server (`src/server/admin/staff-session.ts`):
      - verifies `HMAC-SHA256(PIN_PEPPER, membershipId || pin)` against `memberships.pin_hmac` in constant time;
      - checks the lockout;
      - mints the session via `generateLink` + `verifyOtp(type 'email')`;
      - sets the Supabase auth cookies;
      - records `staff_sessions (membership_id, device_id, started_at, expires_at)`.
   - Selection by name means PINs need not be unique and never leak through a "PIN already taken" message.
5. **Lockout:**
   - 5 failures per (device, membership) → 5 min lock;
   - 20 per device per hour → device locked until a manager unlocks it;
   - counters live in Upstash Redis; failures are audited.
6. **Lifetime:**
   - `fixed` devices keep the session until the end of the business day plus a grace period;
   - `mobile` devices are logged out after **12 h**;
   - managers see active sessions and revoke them remotely (§6.4).
7. **JWT claims:** a Supabase **Custom Access Token Hook** adds `memberships: [{restaurant_id, role}]` and `device_id`. RLS reads `auth.jwt()` claims instead of querying memberships for every row. Access token lifetime is 10 min, and revocation deletes sessions immediately.
8. **Phase 1 (Q1):** the minimal staff screen = paired device + email login (a manager, or the single Basic staff account). Shadow users, PIN and the name picker arrive in Phase 2.
9. **Spike P0-09** proves on local Supabase:
   - `generateLink` + `verifyOtp` yields a session carrying the hook claims;
   - the token can't be reused (gotrue#1357 reports possible reuse; if confirmed, persist and reject used token hashes);
   - revoking a device kills its sessions.

   **Fallback:** sign JWTs with our own imported asymmetric signing key (Supabase supports importing a private key).

## Consequences

- Staff login takes about 3 s, needs no email, and is bound to trusted hardware.
- PIN secrecy rests on the pepper (`PIN_PEPPER`, rotated with re-hash on next login) and online throttling. This is stated plainly, not hidden behind a "strong hash" claim.

## Sources

- https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://github.com/supabase/gotrue/issues/1357
- https://supabase.com/docs/guides/auth/signing-keys
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/auth-mfa
- https://github.com/supabase/auth/blob/master/internal/mailer/validateclient/validateclient.go
