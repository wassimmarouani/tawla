# 04 — Back-office (owner / manager dashboard)

> Domain spec. Source: original spec §6, §8.4, amended by ADR-0014, 0015, 0016, 0018, 0019, 0025, 0027. ADRs win on conflict.

Route `/dashboard`. Desktop and tablet first, fully usable on phones. Measurable goal: **a new venue publishes its full menu in < 30 minutes.**

## Shell and navigation

- **Header:** logo (links to the overview), venue switcher, search button with the **Ctrl/Cmd + K** command palette, plan badge (≥ 1024 px), account menu.
- **Sections:** Overview, Menu, Tables & QR, Team, Settings. Only the sections the role may open are listed (`dashboardNavigation(role)` over `can()`); the server and RLS still check every request (rule 10).
- **Navigation:** sidebar from 1024 px; below, a fixed bottom tab bar (64 px items, safe-area padding) with short visible labels whose accessible name is the full section name. The current section carries `aria-current="page"` (longest path prefix).
- **Command palette:** sections, venue switch (when the account has several), open the public menu, log out.
- **Page template:** one `h1` per page (`PageHeader`: eyebrow, title, description, actions), then content. `loading.tsx` shows a skeleton inside the shell; `error.tsx` shows an inline error with "Try again" while the shell stays usable. Sections not built yet show an honest "coming soon" state, never a dead link.
- **Overview:** venue name, public address, product and category counts, "View menu" (new tab) and the getting-started checklist below.

## Guided onboarding

0. **Sign-up:** venue name and type plus the owner account (name, email, password ≥ 10 characters). Confirming the email creates the venue on an active Basic plan and opens `/dashboard` (ADR-0010 amendment 2026-10-13). The public slug is derived from the name (Latin transliteration; type-based fallback such as `cafe-k3x9` for Arabic names) and editable later.
1. **Venue info:** address, phone, hours (schedule editor with overnight ranges).
2. **Visual identity:** logo, main colour (suggested from the logo, ADR-0018; adjusted for AA contrast, ADR-0027), cover image.
3. **Menu import:** manual entry, or **photo of the paper menu analysed by AI** (ADR-0025). The result is an editable draft table, never auto-published. CSV/Excel import arrives in Phase 2.
4. **Tables:** number of tables, numbering, zones (zones UI gated by plan).
5. **QR codes:** generate and print the tents (ADR-0019).
6. **Staff:** invite by email, pair devices (PIN creation in Phase 2).

A progress checklist stays on the dashboard until onboarding is complete. Steps and their "done" rule: venue (always, the venue exists), menu (≥ 1 product), branding (a logo or a brand colour), tables (≥ 1 table, from P1-08), team (> 1 active member). The first unfinished step is highlighted as the next one.

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
- Destructive actions can be undone for 5 seconds (toast "Undo") instead of a confirmation dialog. Exception: deleting a category, which removes its products too, asks first and then still offers undo.
- **Editor (P1-05):** one page lists categories and products in menu order with three modes: _browse_ (edit, availability switch, actions menu), _select_ (bulk bar: price %, hide, show, duplicate, delete) and _reorder_ (drag handles; keyboard: Space, arrows, Space). Products open a full-page form (`/dashboard/menu/products/new|<id>`): photo, name and description per enabled language with a missing-translation dot, price as typed, category, available and visible switches.
- **Bulk price change:** percentage from −90 % to +200 % (two decimals), rounded half-up to 0.010, 0.050, 0.100 (default), 0.500 or 1.000 DT, in integer millimes; a paid product never becomes free. The preview lists every new price before anything is saved.
- **Product slugs** (`?p=` on the public menu) come from the French name, else English, else `item`, with `-2`, `-3`… when taken; a restored product whose slug was reused gets a new one.
- **Deletion is soft** (`deleted_at`): a category and the products deleted with it share one timestamp, so undo restores exactly those.
- **Option groups (P1-06):** `/dashboard/menu/options` lists reusable groups with their rule ("Required · 1 choice"), options, extra prices and how many products use them. The group dialog edits one language at a time (dots mark missing translations), min/max with inline errors (max ≥ min, min ≤ number of options) and ordered options. Removed options and deleted groups are soft-deleted; deleting a group is undoable.
- **Product options and details (P1-06):** the product form links groups in display order; "Adapt for this item" overrides min/max and each option's price for that product only (blank = the group's value). Badges, diets and the 14 allergens are toggle chips.
- **AI import and translation (P1-13, ADR-0030):** "Import from a photo" (`/dashboard/menu/import`): 1–6 photos resized in the browser → draft with every category and dish, prices parsed from the printed text (shown as "Read: 3,500 DT"), low-confidence rows flagged "Check", unreadable prices unticked → the owner edits, unticks and imports (existing categories with the same name are reused). "Translate the menu": suggestions for each missing enabled language, editable and untickable, applied without overwriting text typed in the meantime. Basic quota: 3 imports and 300 translated items per month, 3 DT cost cap; the friendly state appears when it is used up.
- **Live preview (P1-06):** from 1280 px, a phone-sized frame of the real public menu sits beside the editor and the product form (same-origin framing only). It reloads after every save; after saving a product the menu page opens that product in the preview (`?focus=`). It shows what customers see, so hidden items are not in it.
- **Serving hours** of a category show on the public menu next to its title ("Servi lun. – sam., 07:00–11:00").

## Tables and QR codes

- Create one at a time or in bulk (e.g. tables 1–30), assign to zones.
- One unique QR per table with a random token (never the number).
- **"Regenerate QR"**: the old token stops working immediately (audited).
- **Print tents:** print-optimised page with logo, table number, QR and "Scan to order" in FR/AR/EN. A4 and A6 templates. "Save as PDF" through the browser.
- General QR without a table (shop window, social media) → `/{slug}` read-only menu.
- **Implementation (P1-08):** `/dashboard/tables` lists tables by number (grouped by zone on Pro), with "Add tables" (one, or a range of up to 30; taken numbers are flagged before saving), edit, print one tent, "New QR code" (confirmation, then the old URL shows "This QR code is no longer valid") and delete with undo. Tokens are assigned by the database and never chosen or edited by clients.
- **Tents:** `/dashboard/tables/print?template=a6|a4[&ids=…][&general=1]`. A6 prints one tent per page (105 × 148 mm); A4 prints four tents to cut out. Each tent shows the venue and logo, "Table · طاولة", the number, an optional name, a 52 mm QR code (ECC M) and the call to action in FR, AR and EN ("scan to order" only when ordering is enabled). The sheet always previews and prints in the light theme.
- **Table route:** `/t/{token}` is dynamic and `noindex`. It checks the token on every request and shows the cached public menu with a "Table N · name" badge.

## Staff and devices

- Invite by email (owner, manager, any role), or create a shadow staff member with name + PIN (Phase 2).
- Assign role, deactivate immediately.
- **Devices:** pair (code or QR), name, mode (fixed / mobile), revoke. Active sessions with remote logout.
- **Implemented (P1-11):** `/dashboard/team` lists members (role badges), pending invitations (cancel), seats left on the plan, devices (edit, remove with confirmation) and active sessions (sign out). Pairing shows the code (`ABCD-EFGH`) and a QR code of `/staff/pair?code=…`, valid 10 minutes. Owners and managers only (`staff.manage`).

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
