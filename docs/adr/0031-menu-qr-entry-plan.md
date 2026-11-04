# ADR-0031 — "Menu QR" entry plan

- Status: Accepted
- Date: 2026-11-04
- Amends: ADR-0015 (plans and feature flags), spec 00 §2 and §4.

## Context

- The owner wants to sell the simplest possible offer too: the digital menu and a QR code on each table, nothing else (2026-11-04).
- Some cafés do not want waiter calls or bill requests on their tables yet, and a lower entry price helps the first sale.
- `service_requests` was a plan feature in ADR-0015 but nothing enforced it, because every plan included it.

## Decision

1. **New plan `menu_qr`** ("Menu QR" / "قائمة QR" / "QR Menu"), first in the catalogue (`sort_order 0`): `menu`, `branding`, `multilingual`, `availability_toggle`, `ai_import`, `ai_translate`, `powered_by_badge`. Limits as Basic (40 tables, 1 staff account, 300 products); AI quota 1 photo import and 150 translated items a month (cap 1 DT).
2. **One-time price, no subscription** (amended 2026-11-04 by the owner): 200 DT once (`plans.price_once = 200000`, monthly and yearly prices 0). It includes the menu online and printed, laminated QR codes for the tables. Menu changes (prices, new dishes) are made by Tawla when the venue asks on WhatsApp; the venue does not need to edit it. Changing the price is one `update public.plans` statement.
3. **`service_requests` is now enforced** server-side (CLAUDE.md rule 10):
   - `POST /api/public/service-requests` refuses with `FORBIDDEN` (`details.reason = 'feature'`) when the venue's effective flag is off;
   - the table page `/t/{token}` renders the menu without the service bar.
     The effective flag uses the same rule as the back-office: active override, else plan default, AND the venue's own setting.
4. Sign-up still starts every venue on Basic. Menu QR venues are set up by Tawla after the sales conversation (manual billing in Phase 1); the pricing page and the home send Menu QR buyers to WhatsApp, not to sign-up.

## Consequences

- The pricing page shows four plans, Menu QR first. Basic reads "Everything in QR Menu, plus" waiter calls and bill requests.
- A Super Admin override can grant `service_requests` to a Menu QR venue (trial).
