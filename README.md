# Tawla

Multi-tenant SaaS for Tunisian cafés and restaurants: QR digital menu, table ordering, real-time staff notifications.

- **Rules for contributors and Claude Code:** [`CLAUDE.md`](CLAUDE.md)
- **Documentation map:** [`docs/README.md`](docs/README.md)
- **Local setup:** [`docs/setup.md`](docs/setup.md)
- **Current plan:** [`docs/plan/phase-0-1.md`](docs/plan/phase-0-1.md)

## Quick start

```bash
npm i -g corepack@0.36.0 && corepack enable pnpm   # once per machine (see docs/setup.md on Windows)
pnpm install
cp .env.example .env.local
pnpm dev
```

## Quality gates

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```
