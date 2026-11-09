# ADR-0024 — Hosting regions, environments, API keys, branching, budget

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T7, T8, T13, T14, spec §9.1, §15.1, §15.3–15.4

## Context

- Vercel functions default to `iad1` (Washington DC). Tunisian traffic lands in Marseille/Paris.
- Supabase has `eu-west-3` (Paris) and Vercel has `cdg1` (Paris).
- Vercel Hobby is "personal, non-commercial use" only. Vercel Pro is $20/month per seat. Supabase Pro starts at $25/month (includes leaked-password protection, more Realtime connections, image features, backups).
- Supabase is deprecating the legacy `anon` / `service_role` JWT keys by the end of 2026, in favour of `sb_publishable_…` / `sb_secret_…`.
- GitFlow (`develop` + `main`) plus one Supabase project per PR is heavy for a solo developer.

## Decision

1. **Regions:**
   - Supabase **eu-west-3 (Paris)** for staging and production;
   - Vercel functions pinned to **`cdg1`** (`vercel.json` / `export const preferredRegion`);
   - Upstash Redis in eu-west (Paris or Frankfurt).
2. **API keys:** new Supabase keys only. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the browser; `SUPABASE_SECRET_KEY` server-only, imported only in `src/server/admin/` (ADR-0003). Legacy keys are disabled on hosted projects. Asymmetric JWT signing keys (ES256) are enabled.
3. **Environments:**

| Env        | App                               | Database                                             | Data                                |
| ---------- | --------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Local      | `pnpm dev`                        | Supabase local (Docker), PG 17                       | `supabase/seed.sql`: full demo café |
| CI         | GitHub Actions                    | Supabase local started in the job                    | seed + test fixtures                |
| Preview    | Vercel preview per PR             | **shared staging project** (read-mostly smoke tests) | seed                                |
| Staging    | `main` auto-deploys               | Supabase project `taply-staging`                     | seed + pilot rehearsal data         |
| Production | promoted from staging by tag `v*` | Supabase project `taply-prod`, PITR/backups          | real                                |

Supabase Branching per PR is not used at launch, for cost reasons. Revisit when collaborators join. 4. **Trunk-based workflow:**

- short-lived `feat/…` / `fix/…` branches → PR → squash-merge to `main`;
- `main` is always deployable and deploys to staging;
- production deploys from tags.

This replaces the spec's `develop` branch. 5. **Migrations** apply in CI/CD only: `supabase db push` against staging on merge, and against prod on tag after approval. Never by hand in production. Destructive migrations need a two-step expand/contract. 6. **Secrets** live only in Vercel / GitHub / Supabase Vault env stores. `.env.local` is gitignored, and `.env.example` documents every variable (validated by `@t3-oss/env-nextjs` at boot). 7. **Budget at launch** (monthly, approximate): Vercel Pro $20 + Supabase Pro $25 + Upstash pay-as-you-go (≈ $0–10) + Resend free tier + Sentry/PostHog free tiers + AI usage (ADR-0025). **≈ $50–60/month fixed.**

## Consequences

- Low latency from Tunisia, a simple pipeline, and production protected by tags and approvals.

## Sources

- https://vercel.com/docs/regions · https://vercel.com/docs/plans/hobby · https://vercel.com/pricing
- https://supabase.com/docs/guides/platform/regions · https://supabase.com/pricing
- https://supabase.com/docs/guides/api/api-keys · https://supabase.com/docs/guides/auth/signing-keys
