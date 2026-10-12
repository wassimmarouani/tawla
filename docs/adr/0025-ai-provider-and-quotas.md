# ADR-0025 — AI provider, models, quotas and cost control

- Status: Accepted
- Date: 2026-10-11
- Audit refs: Q4, B3, spec §16.1

## Context

AI powers the onboarding selling point (photo of the paper menu → structured menu) and AR/FR/EN translation, which the owner decided to include in **Basic** with a monthly quota. Costs must be capped per establishment and logged. The provider must stay swappable.

Model IDs and prices were checked against the Claude API reference on 2026-10-11:

- `claude-sonnet-5-5`: $2 / $10 per MTok input/output;
- `claude-haiku-5-5`: $0.10 / $0.50 per MTok for prompts ≤ 100K tokens.

## Decision

1. **Interface:** `src/features/ai/` exposes provider-agnostic functions:
   - `extractMenuFromImages(images, hints) → MenuDraft`;
   - `translateMenuItems(items, from, to[], glossary) → Translations`;
   - `writeDescription(item, tone, locale)` (Phase 2).

   Only `src/features/ai/providers/anthropic.ts` imports `@anthropic-ai/sdk`. Swapping the provider means writing another adapter.

2. **Models:**
   - **menu photo extraction:** `claude-sonnet-5-5`, vision, structured output validated by a Zod schema (`MenuDraft`: categories, products, prices in millimes, option hints, confidence per field);
   - **translations and descriptions:** `claude-haiku-5-5` with structured output and the business glossary (terms like « direct », « capucin », « citronnade » kept as is).
   - Effort and thinking settings are tuned by eval, not guessed. Model IDs live in config (`AI_MODEL_EXTRACT`, `AI_MODEL_TRANSLATE`), never hard-coded.
3. **Refusal handling:** check `stop_reason` before reading content.
   - Sonnet 5.5 requests use the server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
   - Haiku 5.5 has no server-side fallback. On refusal the job returns a typed error and the UI offers manual entry.
4. **Server-only:**
   - calls run in route handlers or background jobs, never from the browser;
   - inputs contain only menu content (never customer personal data);
   - outputs are Zod-validated and shown to the owner as an **editable draft** that is never auto-published.
5. **Quotas and caps:**
   - `plans.ai_monthly_cap_millimes` (cost cap) plus `plans.ai_limits` (e.g. Basic: 3 photo imports and 300 translated items per month; values set in the plans seed and adjusted after pilots);
   - `feature_overrides` can raise them;
   - when the cap is reached, the API returns `AI_QUOTA_EXCEEDED` and the UI shows a friendly upgrade or wait message.
6. **Usage logging:** `ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes, request_id, created_at)`, written from `response.usage` × price table (`src/features/ai/pricing.ts`). Super Admin sees cost per establishment (spec §18 KPI).
7. **Evals:** a fixture set of real-looking Tunisian paper menus (FR/AR, handwritten and printed) in `src/features/ai/evals/`, with expected `MenuDraft` outputs. Scored on price accuracy (millime-exact) and item recall. Run manually before changing model, prompt or effort.

## Consequences

- A strong onboarding demo at bounded cost. The provider can be swapped behind one interface.
