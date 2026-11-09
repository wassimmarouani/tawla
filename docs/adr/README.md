# Architecture Decision Records

ADRs override `docs/spec/*`, which override the original `docs/cahier-des-charges.md` (ADR-0001). New ADR: copy `0000-template.md`.

## Index

| ADR                                                  | Title                                                                  | Status                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------- |
| [0001](0001-record-architecture-decisions.md)        | Record decisions; ADRs override the original spec                      | Accepted                        |
| [0002](0002-stack-and-version-policy.md)             | Stack baseline and dependency version policy                           | Accepted                        |
| [0003](0003-data-access-layer.md)                    | SQL-first migrations, Drizzle under `withRls`, one service-role module | Accepted                        |
| [0004](0004-tenancy-and-schema-conventions.md)       | Tenancy model and schema conventions                                   | Accepted                        |
| [0005](0005-roles-and-permissions.md)                | Eight roles, Support model, staff plan limits                          | Accepted                        |
| [0006](0006-order-state-machine.md)                  | Routing-aware order state machine, atomic transitions                  | Accepted                        |
| [0007](0007-notification-routing-and-reliability.md) | Routing fallbacks, "Start service", receipt acks, escalation           | Accepted                        |
| [0008](0008-realtime-architecture.md)                | Private Broadcast channels from the DB, lazy client connections        | Accepted (spike P0-08)          |
| [0009](0009-scheduled-jobs.md)                       | Scheduled jobs with pg_cron + pg_net                                   | Accepted                        |
| [0010](0010-staff-authentication.md)                 | Shadow users, paired devices, name + PIN                               | Accepted (spike P0-09)          |
| [0011](0011-table-and-client-sessions.md)            | Table vs client sessions; anti-abuse rules                             | Accepted                        |
| [0012](0012-urls-routing-and-locales.md)             | Permanent `/t/{token}` QR URLs, locales, reserved slugs                | Accepted                        |
| [0013](0013-order-numbering-and-versioning.md)       | Business-day order numbers, row versions                               | Accepted                        |
| [0014](0014-menu-model.md)                           | Option overrides, schedules, price rounding, stations                  | Accepted                        |
| [0015](0015-plans-flags-and-phasing.md)              | Plan contents, flag resolution, Phase 1 scope                          | Accepted                        |
| [0016](0016-mutation-transport.md)                   | Route Handlers for staff/public, Server Actions for back-office        | Accepted                        |
| [0017](0017-rendering-caching-proxy-and-csp.md)      | Rendering, caching, `proxy.ts`, CSP                                    | Accepted                        |
| [0018](0018-image-pipeline.md)                       | Pre-generated image renditions                                         | Accepted                        |
| [0019](0019-qr-tent-printing.md)                     | QR tents as print-optimised HTML                                       | Accepted                        |
| [0020](0020-bundle-budget-and-observability.md)      | JS budget and observability loading                                    | Accepted                        |
| [0021](0021-ui-primitives-and-bottom-sheets.md)      | Base UI primitives, bottom sheets                                      | Accepted                        |
| [0022](0022-pwa-and-service-worker.md)               | Own service worker on `serwist` core                                   | Accepted                        |
| [0023](0023-primary-keys-uuidv7.md)                  | UUIDv7 via SQL function (PG 17)                                        | Accepted                        |
| [0024](0024-hosting-environments-and-workflow.md)    | Regions, environments, keys, branching, budget                         | Accepted                        |
| [0025](0025-ai-provider-and-quotas.md)               | AI provider, models, quotas                                            | Accepted (§1–3 by 0030)         |
| [0026](0026-i18n-money-and-search.md)                | i18n, money formatting, search                                         | Accepted                        |
| [0027](0027-design-process-and-visual-direction.md)  | Design-in-code, three visual directions                                | Accepted (choice pending P0-06) |
| [0028](0028-legal-and-compliance-open-items.md)      | Legal and compliance items                                             | Accepted                        |
| [0029](0029-visual-direction-taply-mix.md)           | Visual direction "Taply" (A + B lists + C grid)                        | Accepted                        |
| [0030](0030-gemini-provider.md)                      | Gemini as the AI provider (menu import, translation)                   | Accepted                        |
| [0031](0031-menu-qr-entry-plan.md)                   | "Menu QR" entry plan; `service_requests` enforced                      | Accepted                        |

## Audit ID → ADR

| Audit IDs            | ADR                 |
| -------------------- | ------------------- |
| A1, A5, B6           | 0005                |
| A2, A3, A6, A7       | 0006                |
| A4, D5, D6           | 0007                |
| B1–B5, B7, Q1, Q4a   | 0015                |
| C1, C2, C10, C11     | 0004                |
| C3, E4, Q2           | 0010                |
| C4, C5               | 0013                |
| C6, E1, E5, E6       | 0011                |
| C7, C8, C9, C12      | 0014                |
| D1                   | 0009                |
| D2, D3, D4           | 0008                |
| E2, E3, T3, Q3       | 0003                |
| E7, F1               | 0012                |
| E8, T1               | 0017                |
| E9                   | 0028                |
| F2, F3, F8           | 0026                |
| F4, F5, F6, T9, Q5   | 0027                |
| T2                   | 0016                |
| T4                   | 0018                |
| T5                   | 0019                |
| T6                   | 0020                |
| T7, T8, T13, T14, Q6 | 0024 (Q6 also 0002) |
| T10                  | 0021                |
| T11                  | 0022                |
| T12                  | 0023                |
| Q4b, Q4c             | 0025                |

Verification sources for every ⚠ item: [`docs/research/2026-10-11-verification.md`](../research/2026-10-11-verification.md).
