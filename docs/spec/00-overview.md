# 00 — Product overview, plans, roadmap, business

> Domain spec. Source: original spec §1, §2, §17, §18, §20, amended by ADR-0005, 0015, 0025, 0028. ADRs win on conflict (ADR-0001).

## 1. Product

**Tawla** (working name, "table" in Tunisian Arabic) is a multi-tenant SaaS for Tunisian cafés, restaurants, tea rooms and fast-food places. It replaces paper menus with a digital menu opened by scanning a QR code on the table. Ordering from the table is optional, with real-time notification of the counter and waiters.

### Problems solved

- **Customer:** waits for the menu, paper menus are hard to read, no photos, sometimes no prices.
- **Waiter:** round trips to take orders, mistakes when passing orders to the counter.
- **Manager:** reprints at every price change, no data on best sellers or peak hours.

### Objectives

1. Each venue shows a modern digital menu that the manager updates in under 1 minute.
2. Customers order from the table with no app to install and no account.
3. Every order reaches the counter and the right waiter within **2 s (p95)**, with the table number.
4. Usable statistics: sales, best sellers, peak hours.
5. A subscription product configured by plan, with no per-customer development.

### Targets

| Segment                                         | Main need                          |
| ----------------------------------------------- | ---------------------------------- |
| Cafés (high turnover, low average ticket)       | Speed of service, price updates    |
| Restaurants (bigger menus, options)             | Photos, descriptions, options      |
| Tea rooms and pastry shops (families, tourists) | Visual, multilingual menu          |
| Fast food                                       | Direct transmission to preparation |

### Guiding principles

- **Zero customer friction:** scan, menu visible in < 2 s, no sign-up.
- **Manager autonomy:** everything is configured from the dashboard.
- **One codebase:** every venue is a tenant; features are switched on by plan.
- **Mobile-first and light on data:** venue Wi-Fi and 4G are often weak.
- **Must look great without photos** (ADR-0027).

## 2. Plans (amended by ADR-0015)

| Feature (flag)                                                      | Basic                     | Pro                                | Premium                                                  |
| ------------------------------------------------------------------- | ------------------------- | ---------------------------------- | -------------------------------------------------------- |
| QR menu, categories, products, photos, prices (`menu`)              | ✓                         | ✓                                  | ✓                                                        |
| Branding: logo, colours, cover (`branding`)                         | ✓                         | ✓                                  | ✓                                                        |
| AR / FR / EN menu (`multilingual`)                                  | ✓                         | ✓                                  | ✓                                                        |
| Call waiter + request bill with payment method (`service_requests`) | ✓                         | ✓                                  | ✓                                                        |
| One-click out-of-stock (`availability_toggle`)                      | ✓                         | ✓                                  | ✓                                                        |
| Real-time notification of service requests to staff                 | ✓                         | ✓                                  | ✓                                                        |
| Satisfaction feedback                                               | ✓                         | ✓                                  | ✓                                                        |
| AI menu import from photo (`ai_import`)                             | ✓ quota                   | ✓                                  | ✓                                                        |
| AI translation (`ai_translate`)                                     | **✓ monthly quota**       | ✓                                  | ✓                                                        |
| Cart and table ordering (`ordering`)                                | —                         | ✓                                  | ✓                                                        |
| Real-time order notifications to counter and waiters                | —                         | ✓                                  | ✓                                                        |
| Customer order tracking, "View my bill" (`order_tracking`)          | —                         | ✓                                  | ✓                                                        |
| Staff accounts (excluding owner)                                    | 1                         | up to 10                           | unlimited                                                |
| PIN login, multiple staff on shared devices (`staff_pin`)           | —                         | ✓                                  | ✓                                                        |
| Service zones (`staff_zones`)                                       | —                         | ✓                                  | ✓                                                        |
| Bar / kitchen display (`kitchen_display`)                           | —                         | —                                  | ✓                                                        |
| Statistics                                                          | menu views + satisfaction | sales and products (`stats_sales`) | advanced + AI insights (`stats_advanced`, `ai_insights`) |
| AI descriptions (`ai_descriptions`)                                 | —                         | ✓                                  | ✓                                                        |
| Promotions, happy hour, time-based prices (`promotions`)            | —                         | —                                  | ✓                                                        |
| Thermal ticket printing (`printing`)                                | —                         | —                                  | ✓                                                        |
| Multi-site / chains (`multi_site`)                                  | —                         | —                                  | ✓                                                        |
| "Powered by Tawla" badge (`powered_by_badge`)                       | ✓                         | —                                  | —                                                        |

### Feature flags

- Effective value: `override ?? planDefault`, AND the restaurant's own setting where one exists (e.g. ordering switched off).
- Super Admin can force a flag per restaurant with an optional expiry (trial, commercial gesture).
- **Checked server-side, never only in the UI.**

### Out of scope (v1)

Delivery and online take-away · native iOS/Android apps (PWA instead) · detailed stock management · certified POS and accounting · customer online payment (Phase 4) · split payments.

## 3. Roadmap (amended)

| Phase                        | Duration (solo dev, estimate) | Content                                                                                                                                                                                                           | Milestone                                                                                                     |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0. Foundations               | 1–2 weeks                     | Repo, CI, Supabase local, schema core + RLS + tests, auth, **visual direction choice**, design system, demo café seed, realtime and auth spikes                                                                   | —                                                                                                             |
| 1. MVP Menu (Basic sellable) | 4–5 weeks                     | Menu editor, public menu in 3 languages, tables and QR tents, AI import and translation, **minimal staff screen** (paired device, live service requests, availability toggle, push), landing, legal pages, pilots | **M1:** 3 pilot cafés use the menu for 2 weeks without blocking bugs                                          |
| 2. Ordering                  | 4 weeks                       | Cart, orders, full staff app (PIN, zones, kanban), order tracking, escalation, CSV import, Pro trial                                                                                                              | **M2:** 500 pilot orders, zero lost orders, zero missed notifications (measured by acks, ADR-0007), p95 < 2 s |
| 3. Pro / Premium             | 4–6 weeks                     | Statistics, billing and invoices, Super Admin console, kitchen display, printing, AI insights                                                                                                                     | **M3:** 10 paying venues, monthly churn < 5 %                                                                 |
| 4. Growth                    | continuous                    | Multi-site, loyalty, promotions, AI assistants, online payment, custom domains                                                                                                                                    | —                                                                                                             |

Detailed Phase 0–1 tasks: [`docs/plan/phase-0-1.md`](../plan/phase-0-1.md).

## 4. Business model (hypotheses to validate with 10–15 managers)

| Revenue        | Hypothesis                                                |
| -------------- | --------------------------------------------------------- |
| Basic          | 30–50 DT / month                                          |
| Pro            | 80–120 DT / month                                         |
| Premium        | 150–250 DT / month                                        |
| Annual payment | 2 months free                                             |
| Set-up fee     | free or 100–200 DT (photos, data entry, on-site training) |
| QR tents       | margin on acrylic/wood printing                           |

Acquisition: 14-day Pro trial (from Phase 2), live demo on the manager's phone, referral (1 month free per referred venue), "Powered by Tawla" badge on Basic.
KPIs from the first customer: MRR, trial → paid conversion, monthly churn, orders per venue per day, **AI cost per venue**.

Market differentiators: prices in dinars with millimes, Arabic UI with a derja tone, WhatsApp support, on-site set-up for the first customers (menu photo, QR printing, 20-minute staff training), works on weak connections and entry-level phones.

## 5. Glossary

| Term           | Definition                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Tenant         | A client venue (`restaurants`), data isolated from all others                                                           |
| Organization   | Owner account grouping one or more restaurants (ADR-0004)                                                               |
| Feature flag   | Switch enabling a feature by plan or override                                                                           |
| Table session  | Occupancy of a table, from the first meaningful action to bill closure or inactivity timeout; holds the bill (ADR-0011) |
| Client session | One customer phone inside a table session (signed cookie)                                                               |
| Table token    | 128-bit random string in the QR URL `/t/{token}`                                                                        |
| Paired device  | Staff device trusted by the restaurant (ADR-0010)                                                                       |
| Business day   | Day boundary at the restaurant's cutoff (default 05:00) (ADR-0013)                                                      |
| Station        | Preparation post (bar, kitchen, pastry)                                                                                 |
| Millime        | 1/1000 dinar; unit of every stored amount                                                                               |
| RLS            | Postgres Row Level Security                                                                                             |
| PWA            | Installable web app with push and offline cache                                                                         |
| Idempotency    | A request repeated gives the same result once                                                                           |

## 6. Open points (owner actions)

- [ ] Final commercial name and domain (.tn and .com). Code uses `APP_NAME` / `APP_DOMAIN` constants.
- [ ] Price grid after interviews with 10–15 managers.
- [ ] Subscription payment gateway (Konnect, Flouci or other). Needed by Phase 3.
- [ ] AI monthly caps per plan. Start low, adjust after pilots (ADR-0025).
- [ ] Lawyer: INPDP declaration and authorisation for data transfer abroad (ADR-0028).
- [ ] Accountant: legal status, VAT, invoice obligations incl. e-invoicing (ADR-0028).
- [ ] Choice of pilot venues.
- [ ] Visual direction choice (task P0-06).
