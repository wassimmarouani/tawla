# 12 — AI features and growth features

> Domain spec. Source: original spec §16, amended by ADR-0015, 0025. ADRs win on conflict.

AI serves two goals: cut the manager's effort (menu ready in minutes) and raise revenue (suggestions, analysis). **Every AI output is a proposal that the manager validates.**

## AI features

| Feature                            | Value                                                  | How                                                                                                                                                                                                | Plan                           | Phase |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----- |
| Menu import from photo             | Onboarding in 10 min instead of 2 h; key selling point | Manager photographs the paper menu (1–6 photos). `claude-sonnet-5-5` extracts categories, products, prices (millimes), option hints, with per-field confidence. Editable draft table before import | All (Basic: monthly quota)     | 1     |
| Automatic translation AR / FR / EN | Tourist-ready menu without effort                      | One click translates names and descriptions with `claude-haiku-5-5` and the business glossary (« direct », « capucin », « citronnade » kept)                                                       | All (**Basic: monthly quota**) | 1     |
| Description writing                | More appetising menu                                   | Short description from name and ingredients, tone chosen by the manager (`claude-haiku-5-5`)                                                                                                       | Pro+                           | 2     |
| Photo enhancement                  | Professional look from a phone                         | Background removal, uniform background, crop, light correction (provider to choose)                                                                                                                | Pro+                           | 3     |
| "Often taken with"                 | Higher average ticket                                  | Manual rules first; association rules on the venue's order history later                                                                                                                           | Pro+                           | 2     |
| Natural-language insights          | Manager understands the numbers without analysis       | Weekly summary generated from aggregated stats                                                                                                                                                     | Premium                        | 3     |
| Manager assistant                  | Questions in French, Arabic or derja                   | "How many coffees yesterday?", "Raise juices by 10 %". Answers or proposes an action the manager confirms                                                                                          | Premium                        | 4     |
| Customer assistant                 | Help for tourists and undecided customers              | "Something fresh without sugar?" Answers restricted to the menu's products                                                                                                                         | Premium                        | 4     |

## Integration rules (ADR-0025)

- Server-side only, behind `src/features/ai/` (provider-agnostic interface; Anthropic adapter only in `providers/anthropic.ts`). Model IDs come from env config.
- Structured outputs validated by Zod. Check `stop_reason` (refusal) before reading content. Sonnet requests use the server-side refusal fallback. Haiku refusals → typed error + manual path.
- **Quotas and cost caps** per plan (`plans.ai_monthly_cap_millimes`, `plans.ai_limits`), overridable per venue. `AI_QUOTA_EXCEEDED` error with a friendly UI.
- **Cost logging** per call in `ai_usage`. Cost per venue visible to Super Admin.
- **No customer personal data** is ever sent to a model.
- Evals on realistic Tunisian menus (FR/AR, printed and handwritten) before any model, prompt or effort change. Price accuracy must be millime-exact.

## Business features (later phases)

- **Happy hour and time-based prices:** automatic price or discount by day and time, using the shared Schedule engine (ADR-0014). Premium, Phase 3–4.
- **Promotions and bundles:** "coffee + croissant" fixed price; featured product of the day at the top. Premium.
- **Ticket printing** on thermal printers (ESC/POS) at bar and kitchen, via a small local bridge or a cloud print service. Premium, Phase 3.
- **App-free loyalty:** optional phone number; one free drink every 10 orders. Phase 4. Needs a privacy review because it collects customer PII.
- **Event mode:** special Ramadan menu (iftar times, ftour and shour offers), football matches, evenings. Uses schedule exceptions plus menu variants.
- **Multi-site:** one owner manages several venues from one account (organizations, ADR-0004), with a shared or site-specific menu. Premium, Phase 4.
- **Offline staff mode:** actions queued and synced on reconnect (Route Handlers + idempotency make this possible, ADR-0016). Phase 2–3.
- **Printer partnership:** acrylic or engraved wood QR tents in the venue's colours.

## Tunisian market differentiation

Prices in dinars with millimes; Arabic UI with a derja tone in messages; WhatsApp support; on-site set-up for first customers; works with weak connections and entry-level phones.
