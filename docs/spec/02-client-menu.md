# 02 — Customer menu (client surface)

> Domain spec. Source: original spec §4, §8.2–8.3, amended by ADR-0011, 0012, 0014, 0015, 0026, 0027. ADRs win on conflict.

The customer uses their phone's browser after scanning: no app, no account.

## URLs (ADR-0012)

- Table QR: `https://{APP_DOMAIN}/t/{token}`. The token is 128-bit random, global, and identifies restaurant + table.
- General QR / social / SEO: `https://{APP_DOMAIN}/{slug}`, read-only, no table.
- No locale in customer URLs. Language = explicit choice cookie → enabled locales matched against `Accept-Language` → restaurant default.
- `GET` never creates a session. Token routes are `noindex`.

## Sessions (ADR-0011)

- First meaningful action (add to cart, call waiter, view bill) → `POST /api/public/sessions` → joins or opens the table session and creates the client session (signed HttpOnly cookie).
- Table session auto-closes after 90 min of inactivity (configurable) or on bill closure. The client cookie lasts at most 3 h. After closure the phone falls back to read-only.

## Home of the menu

- Header: cover image, logo, venue name, **open/closed status** from the schedule and manual status (ADR-0014).
- **"Table 9" badge** always visible on table URLs.
- Collapsible practical info: hours, address with Google Maps link, Wi-Fi password, social links.
- Language switcher AR / FR / EN (enabled locales only) with auto-detection. **Full RTL** in Arabic.

## Navigation

- Sticky horizontal category bar with icon or image per category, synced to scroll (scroll-spy). Categories outside their time window are hidden or shown greyed per setting.
- Instant search, typo- and accent-tolerant in FR/AR/EN and Latin-script derja (ADR-0026). Loaded on focus.
- Optional filters: vegetarian, gluten-free, spicy, new.
- **Layout adapts to photo coverage per category** (ADR-0027): ≥ 50 % photos → cards (list or grid per restaurant setting); otherwise an elegant typographic list. Photo-less items in photo categories get a branded monogram tile.
- Product card: photo (if any), name, short description, price ("from …" when sizes differ), badges (New, Popular, Spicy, Unavailable).
- **Unavailable products are greyed with "Unavailable"**, never hidden silently. They update within 5 s of the toggle (ADR-0008 strategy).
- **Product sheet** (bottom sheet, drag to close, URL-synced so Back closes it): large photo, full description, allergens, option groups validated live with the price updated, quantity, free note ("no sugar").

## Options (ADR-0014)

- A product has 0–n option groups. Each group has `min_select` / `max_select`; "required" = `min_select > 0`. Each option has a price delta, which a product may override.

| Example group                      | Rule               |
| ---------------------------------- | ------------------ |
| Size (Small, Large +1.500 DT)      | min 1, max 1       |
| Sugar (Normal, Less, None)         | min 1, max 1, free |
| Extras (Cheese +2.000, Egg +1.000) | min 0, max 3       |

## Cart (Pro+)

- Floating cart button with item count and total, animated on add (item flies to the button); hidden when empty.
- Cart as a bottom sheet: change quantities, remove, general note.
- Saved locally (Zustand persisted in localStorage, keyed by table session). It survives refresh and network loss.
- "Often taken with" suggestions before sending (Phase 2: manual rules; later: association rules).
- "Send order" shows a recap and asks for explicit confirmation. Idempotency key generated client-side (UUIDv7). Offline → sending disabled with a clear message, cart kept.

## Order tracking (Pro+)

- Live tracking: Pending → Accepted → Preparing → Ready → Served, with timestamps and a progress bar.
- Several successive orders per session, all added to the table bill.
- The customer can cancel while **Pending**.
- Rejection is shown with the reason chosen by staff.

## Service requests (all plans)

- **Call waiter:** alert to the zone's waiters (or all staff on Basic). One call per 60 s per table session; the button shows a countdown.
- **Request bill:** choose cash or card so the waiter arrives prepared. One per 60 s.
- **View my bill (Pro+ only):** everything ordered by the table session, with the total. Hidden on Basic (ADR-0015).

## After service

- 1–5 star rating plus optional comment, visible only to managers. Offered after bill closure (Pro+) or after the bill request is handled (Basic). One per client session.
- Rating 4–5 → invitation to leave a Google review (configurable link).

## Prices (ADR-0026)

- Stored as integer millimes. Displayed `3,500 DT` (fr), `3.500 د.ت` (ar), `TND 3.500` (en). No floating-point arithmetic anywhere.
- **The server always recomputes totals** from database prices. Client totals are display-only.

## UX rules

- At most three taps from scan to first item in the cart.
- No blocking modal dialogs on the customer menu; errors are inline with a solution.
- Skeletons at final dimensions, thumbhash blur placeholders, no layout shift.
- Touch targets ≥ 44 px, safe-area insets respected, `dvh` heights.
- Light / dark / auto per restaurant setting.

## Implementation status (P1-07a, 2026-10-14)

- **Live:** `/{slug}` (rewritten to `/[locale]/r/[slug]`) with the cached `get_public_menu` loader (tags `menu:slug:<slug>` and `menu:<public_id>`, unknown slugs cached for minutes), header (cover or dotted brand band, logo or monogram, live open status as a dynamic hole), venue language pills, sticky category bar with scroll-spy, numbered sections (photo grid when ≥ 50 % photos, printed list otherwise), "from" prices, badges (spicy shown; other dietary facts in the product sheet), sold-out state, tenant brand colours for light and dark, not-found page for unknown, suspended or deleted venues (streamed: HTTP 200 with `noindex`).
- **Measured:** initial JS 134.5 KB gz on a phone, CLS 0, axe clean and no overflow at 7 widths × FR/AR × light/dark.
- **P1-07b:** product sheet on `?p=<slug>` (native `<dialog>`: focus trap, Esc, backdrop; Back closes it; rendered in a dynamic hole from the cached menu) with photo, price, diet labels, option groups and their rules, allergens (EU 14). Search loads on first intent (panel, uFuzzy and index in a lazy chunk; plural forms pre-rendered on the server). Filters (vegetarian, gluten-free, spicy, new) hide server-rendered items and empty sections and their category chips. JSON-LD `CafeOrCoffeeShop`/`Restaurant` + `Menu` (prices as exact decimals, availability, diets), canonical URL and Open Graph cover. Initial JS 138.3 KB gz.
- **Deviation:** the sheet closes by button, backdrop, Esc or Back; drag-to-close needs a gesture library and waits for the ordering sheet (Phase 2), where it is worth the bytes.
- **Venue info (P1-14):** a folded "Info" panel under the status: address with a Google Maps directions link, Wi-Fi name and password, Instagram / Facebook / TikTok links, from Settings (`get_public_menu.restaurant.info`, whitelisted keys only). A forced light or dark theme (Settings) pins the menu's surfaces and brand shades.

## Implementation status (P1-10, 2026-11-03)

- **Service bar** on `/t/{token}` only: fixed at the bottom (safe area), "Call the waiter" and "The bill" (inline cash / card choice, never a modal). The first tap joins the table (`POST /api/public/sessions`), then sends the request with a client-generated `Idempotency-Key` that its retries reuse. Each request carries the table token: a cookie from another table is refused with `SESSION_EXPIRED`, so a phone that moved joins its new table.
- **States:** "Staff notified" with an m:ss countdown (60 s, shared by the table: another phone gets "Already requested for this table, try again in…"), then "Waiter on the way" when staff claim it. Offline: buttons disabled with a clear message. A reload restores the state from `GET /api/public/session?token=` (read-only, `{ state: null }` without a session at that table).
- **Live updates:** the `s:` channel opens only while a request is pending and the page is visible; on (re)connect the bar refetches, and it polls every 10 s while the socket is down (ADR-0008 §6). No websocket on page load.
- **Feedback** once the bill request is handled (claimed or done) or the session closes: 1–5 stars and an optional comment; 4–5 stars show the venue's Google review link (`restaurants.settings.google_review_url`, https only, edited in Settings with P1-14). "Later" dismisses it; it is not offered again in that tab.
- **Availability:** checked on focus (`GET /api/public/availability`, at most every 5 s); the `m:` channel opens on the first interaction (tap, key, wheel or scroll) and closes after 2 idle minutes. When a product or option differs from the page, the page re-renders from the invalidated menu cache (`router.refresh()`). Inert inside the back-office preview frame. Measured: toggle → greyed on another phone in under 5 s (E2E).
- **Menu views** are counted once per page per tab with `sendBeacon` (statistics).
- **Turnstile:** past 20 session opens per minute from one IP (a busy café stays under it) (anomaly heuristic), `POST /api/public/sessions` answers `CHALLENGE_REQUIRED`; the bar loads Turnstile ("interaction-only") and retries with the token, verified server-side. Local and CI use Cloudflare's test keys.
- **Measured:** table route initial JS 145 KB gz (budget 150 KB); the bar, feedback card, realtime client and Turnstile beyond the bar itself load lazily.
