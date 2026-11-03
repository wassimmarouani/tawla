# ADR-0030 — Gemini as the AI provider for menu import and translation

- Status: Accepted
- Date: 2026-11-03
- Supersedes: ADR-0025 §1 (adapter name), §2 (models) and §3 (refusal handling). ADR-0025 §4–7 (server-only calls, quotas, usage logging, evals) still apply.

## Context

- The owner chose Google Gemini for AI menu import and translation (2026-11-03) and supplied the API key.
- ADR-0025 already isolates the provider behind `src/features/ai/` with Zod-validated outputs, so only the adapter and the price table change.
- Prices checked on the official pricing page on 2026-11-03: `gemini-2.5-flash` costs $0.30 per million input tokens (text, image) and $2.50 per million output tokens, thinking tokens included.

## Decision

1. **Adapter:** `src/features/ai/providers/gemini.ts` calls the REST endpoint `models/{model}:generateContent` with `fetch` and the `x-goog-api-key` header. There is no SDK dependency, and the adapter is the only file that knows the wire format.
2. **Models:** `gemini-2.5-flash` for both photo extraction (images inline, at most 6 per import, resized in the browser) and translations. `AI_MODEL_EXTRACT` and `AI_MODEL_TRANSLATE` override them; model ids are never hard-coded elsewhere.
3. **Structured output:**
   - `generationConfig.responseMimeType = application/json` with a `responseSchema`, temperature 0;
   - the JSON is then parsed with the same Zod schemas as before (`MenuDraft`, `Translations`): the schema sent to Gemini is a hint, Zod is the contract.
4. **Refusals and failures:** a missing candidate, `promptFeedback.blockReason`, or a `finishReason` other than `STOP` / `MAX_TOKENS` becomes a typed `AI_REFUSED` error; the UI offers manual entry. Invalid JSON or a Zod failure becomes `AI_INVALID_OUTPUT`. Network and HTTP errors become `AI_UNAVAILABLE`. None of these consume quota.
5. **Costs:** `ai_usage` stores `promptTokenCount` as input and `candidatesTokenCount + thoughtsTokenCount` as output, priced from `src/features/ai/services/pricing.ts` in millimes (integer maths on micro-dollars; the dollar→dinar rate is a constant reviewed with the price table).
6. **Keys:** `GEMINI_API_KEY` lives only in server env (`.env.local` locally, Vercel env in hosted environments). CI never calls the API: tests use recorded responses.

## Consequences

- Same features and quotas, lower cost per import. Switching back to Anthropic or another provider means one new adapter and a price-table entry.

## Sources

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/api/generate-content
