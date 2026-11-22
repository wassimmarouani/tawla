# Taply

Multi-tenant SaaS for Tunisian cafés and restaurants: QR digital menu, call-waiter and bill-request alerts in real time, FR / AR (RTL) / EN. Customers scan a QR on the table and get a fast menu with no app and no account; owners manage everything from a back-office; staff get notifications on a paired PWA.

- **Rules for contributors and Claude Code:** [`CLAUDE.md`](CLAUDE.md)
- **Documentation map:** [`docs/README.md`](docs/README.md)
- **Local setup:** [`docs/setup.md`](docs/setup.md)
- **Current plan:** [`docs/plan/phase-0-1.md`](docs/plan/phase-0-1.md)

## Product tour

- **Marketing landing** (`/`) — hero + "Démos en direct" section with filter chips (café, italien, pâtisserie, bar, street food, glacier), 10 live demo venues each in its own visual variant, a phone-shaped preview modal per card, pricing (`/pricing`), how-it-works (`/how-it-works`), public venue directory (`/venues`), photo credits (`/legal/credits`) and legal placeholders. "I love this template" opens WhatsApp pre-filled.
- **Public customer menu** (`/{slug}` or `/t/{token}`) — FR/AR/EN, mobile-first, ≤ 150 KB initial JS, instant call-waiter / bill-request with real-time alerts. Each demo renders under one of seven "Méditerranée moderne" presets (`medina`, `specialty`, `trattoria`, `atelier`, `nocturne`, `street`, `gelato`) — each a full palette with its own display font, radius scale, letter spacing and color mode. Owners pick their preset from Settings.
- **Back-office** (`/dashboard`) — guided onboarding (< 30 min to a published menu), menu editor with a sticky side phone preview, 9 ready menu templates (café, pizzeria, trattoria, pâtisserie, patisserie moderne, bar cocktail, street food, glacier, modern café), tables & QR tents, team, settings, 30-day analytics (`/dashboard/analytics`).
- **Staff PWA** (`/staff`) — paired devices with sound, vibration, Web Push, Wake Lock and receipt acks.
- **Super Admin console** (`/admin`) — platform KPIs, venues list, plan + flag overrides, audit log, TOTP-enforced, one-click demo install (creates the 10 demos), impersonation of any venue owner with an audited support-mode banner.

## Quick start

```bash
npm i -g corepack@0.36.0 && corepack enable pnpm   # once per machine (see docs/setup.md on Windows)
pnpm install
cp .env.example .env.local
pnpm db:start                                      # local Supabase in Docker
pnpm db:reset                                      # migrations + seeds + demo photos
pnpm dev
```

See [`docs/setup.md`](docs/setup.md) for environment variables (local Supabase, Gemini AI key, WhatsApp contact, demo slug, VAPID, Turnstile) and the hosted-env bootstrap (how to promote the first Super Admin, enable the Supabase Auth hook and install the demos).

## Quality gates

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
pnpm test:integration     # local Supabase: RLS, realtime, server adapters
pnpm test:db              # pgTAP
pnpm check:rls            # every table has RLS + tests
```
