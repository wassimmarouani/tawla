# Documentation map

**Precedence:** `adr/` > `spec/` > `cahier-des-charges.md` (ADR-0001). Load only what the task needs.

| If you work on… | Read |
|---|---|
| Anything (always) | `/CLAUDE.md`, then the spec file(s) below |
| Product scope, plans, flags, roadmap, business | [spec/00-overview.md](spec/00-overview.md), ADR-0015 |
| Roles, permissions, plan limits | [spec/01-roles-permissions.md](spec/01-roles-permissions.md), ADR-0005 |
| Customer menu, cart, tracking, service requests | [spec/02-client-menu.md](spec/02-client-menu.md), ADR-0011, 0012, 0026, 0027 |
| Staff PWA, devices, PIN, notifications | [spec/03-staff-app.md](spec/03-staff-app.md), ADR-0007, 0008, 0010, 0022 |
| Back-office, onboarding, menu editor, tables, QR | [spec/04-back-office.md](spec/04-back-office.md), ADR-0014, 0018, 0019 |
| Super Admin console, billing | [spec/05-super-admin.md](spec/05-super-admin.md) |
| Order and session lifecycle | [spec/06-order-lifecycle.md](spec/06-order-lifecycle.md), ADR-0006, 0011, 0013 |
| Architecture, folders, endpoints, realtime | [spec/07-architecture.md](spec/07-architecture.md), ADR-0003, 0008, 0016, 0017 |
| Database schema | [spec/08-data-model.md](spec/08-data-model.md), ADR-0004, 0023, plus the migrations themselves |
| Security, anti-abuse, compliance | [spec/09-security.md](spec/09-security.md), ADR-0010, 0011, 0028 |
| Design system, UX, accessibility | [spec/10-design-system.md](spec/10-design-system.md), ADR-0021, 0027 (+ ADR-0029 once chosen) |
| Performance, i18n, SEO, tests, CI, DoD | [spec/11-quality.md](spec/11-quality.md), ADR-0020, 0024, 0026 |
| AI and growth features | [spec/12-ai-and-growth.md](spec/12-ai-and-growth.md), ADR-0025 |
| Stack and versions | [adr/0002-stack-and-version-policy.md](adr/0002-stack-and-version-policy.md) |
| Local environment | [setup.md](setup.md) |
| Current implementation plan | [plan/phase-0-1.md](plan/phase-0-1.md) |
| Why a decision was made, with sources | [adr/README.md](adr/README.md), [research/](research/) |
