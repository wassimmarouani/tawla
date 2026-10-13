# 04 — Back-office (owner / manager dashboard)

> Domain spec. Source: original spec §6, §8.4, amended by ADR-0014, 0015, 0016, 0018, 0019, 0025, 0027. ADRs win on conflict.

Route `/dashboard`. Desktop and tablet first, fully usable on phones. Measurable goal: **a new venue publishes its full menu in < 30 minutes.**

## Guided onboarding

0. **Sign-up:** venue name and type plus the owner account (name, email, password ≥ 10 characters). Confirming the email creates the venue on an active Basic plan and opens `/dashboard` (ADR-0010 amendment 2026-10-13). The public slug is derived from the name (Latin transliteration; type-based fallback such as `cafe-k3x9` for Arabic names) and editable later.
1. **Venue info:** address, phone, hours (schedule editor with overnight ranges).
2. **Visual identity:** logo, main colour (suggested from the logo, ADR-0018; adjusted for AA contrast, ADR-0027), cover image.
3. **Menu import:** manual entry, or **photo of the paper menu analysed by AI** (ADR-0025). The result is an editable draft table, never auto-published. CSV/Excel import arrives in Phase 2.
4. **Tables:** number of tables, numbering, zones (zones UI gated by plan).
5. **QR codes:** generate and print the tents (ADR-0019).
6. **Staff:** invite by email, pair devices (PIN creation in Phase 2).

A progress checklist stays on the dashboard until onboarding is complete.

## Menu management

- **Categories:** multilingual name, icon or image, drag-and-drop order, visibility, time window (ADR-0014 schedule, e.g. "Breakfast" 07:00–11:00, Mon–Sat).
- **Products:** multilingual name and description, price (millimes, entered as `3,5` or `3.500`), photo, category, station (Phase 3), badges, allergens, order, visibility.
- **Option groups:** reusable (e.g. "Sugar" shared by hot drinks), `min/max`, with per-product overrides of rules and option prices.
- **Availability:** one-click "Available" switch in the list, also from the staff app.
- **Bulk actions:**
  - change a category's prices by a percentage, rounded to the configured step (default 0.100 DT), with a preview before applying;
  - hide several products;
  - duplicate.
- **Live preview:** a mobile preview (iframe of the real customer menu, draft mode) next to the editor, updated as you type.
- **Price history:** every change is kept (`price_history`). Orders keep the price at the time of purchase.
- **AI translation:** translate missing languages in one click with the business glossary (monthly quota on Basic). Results shown as suggestions to accept.
- Destructive actions can be undone for 5 seconds (toast "Undo") instead of a confirmation dialog.

## Tables and QR codes

- Create one at a time or in bulk (e.g. tables 1–30), assign to zones.
- One unique QR per table with a random token (never the number).
- **"Regenerate QR"**: the old token stops working immediately (audited).
- **Print tents:** print-optimised page with logo, table number, QR and "Scan to order" in FR/AR/EN. A4 and A6 templates. "Save as PDF" through the browser.
- General QR without a table (shop window, social media) → `/{slug}` read-only menu.

## Staff and devices

- Invite by email (owner, manager, any role), or create a shadow staff member with name + PIN (Phase 2).
- Assign role, deactivate immediately.
- **Devices:** pair (code or QR), name, mode (fixed / mobile), revoke. Active sessions with remote logout.

## Settings

- **Orders (Pro+):** enabled or not, staff validation required (default on; auto-accept only after the first accepted order of a session), routing mode, escalation thresholds, rate limits.
- **Languages:** enabled locales and default.
- **Hours:** schedule + exceptions + "close now" switch. Ordering is blocked outside hours; the menu stays viewable.
- **Business day cutoff** (default 05:00) and table-session inactivity timeout (default 90 min).
- **Customer menu theme:** main colour, light / dark / auto, card style (list or grid).
- **Links:** Google reviews, Instagram, Facebook, TikTok, Wi-Fi.
- **Price rounding step** for bulk changes.

## Dashboard and statistics

| Indicator                 | Plan         | Detail                                 | Phase                   |
| ------------------------- | ------------ | -------------------------------------- | ----------------------- |
| Scans and menu views      | All          | Per day, per table, per language       | 1 (counter), 3 (charts) |
| Satisfaction              | All          | Average rating and comments            | 1                       |
| Order revenue             | Pro, Premium | Day / week / month, vs previous period | 3                       |
| Orders and average ticket | Pro, Premium | Per day and hour                       | 3                       |
| Top and flop products     | Pro, Premium | Quantities and revenue                 | 3                       |
| Peak hours                | Pro, Premium | Heat map day × hour                    | 3                       |
| Service time              | Pro, Premium | Received → accepted → served           | 3                       |
| Per-waiter performance    | Premium      | Orders handled, average delay          | 3                       |
| AI insights               | Premium      | Weekly natural-language summary        | 3                       |

CSV and PDF export of all statistics (Phase 3).

## Design intent

"Calm productivity" (Linear-like): bento dashboard grid, inline editing, Cmd/Ctrl + K command palette, helpful empty states ("Add your first category"), keyboard-navigable throughout.
