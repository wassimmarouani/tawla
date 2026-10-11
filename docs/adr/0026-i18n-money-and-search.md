# ADR-0026 — Internationalisation, money formatting and menu search

- Status: Accepted
- Date: 2026-10-11
- Audit refs: F2, F3, F8, spec §4.8, §14.4

## Context

- The spec's price format ("3,500 DT" in French, "3.500 د.ت" in Arabic) doesn't match what `Intl.NumberFormat` produces for `fr-TN`/`ar-TN`, and no English format is specified.
- Search must tolerate typos and accents. That includes Arabic normalisation and Latin-script derja names ("capucin", "direct").
- "Arabic + derja" for the UI is ambiguous.

## Decision

1. **Locales:** `fr` (default), `ar` (Modern Standard Arabic, RTL), `en`.
   - Derja appears only in a few warm-tone strings (marketing, empty states), always reviewed by a native speaker.
   - Message files: `src/messages/{fr,ar,en}/{client,staff,dashboard,admin,marketing,common}.json`.
   - TS type-checking of message keys (next-intl `AppConfig`), with a CI check for missing keys across locales.
2. **Money:** one formatter, `formatMoney(millimes, locale)`, in `src/lib/money/`. Always 3 decimals, Latin digits.

| Locale | Output for 3500 | Output for 12500 |
|---|---|---|
| fr | `3,500 DT` | `12,500 DT` |
| ar | `3.500 د.ت` | `12.500 د.ت` |
| en | `TND 3.500` | `TND 12.500` |

   - Grouping from 1,000 DT upwards: fr uses a narrow no-break space (U+202F), e.g. `1 250,000 DT`; en and ar use `,`, e.g. `TND 1,250.000` / `1,250.000 د.ت`.
   - Number and currency are joined with a no-break space, and the RTL isolate `⁨…⁩` wraps amounts in Arabic text.
   - All arithmetic happens on integers. `parseMoneyInput("3,5") → 3500` handles comma or dot input.
   - Snapshot tests cover the table above and edge cases (0, 50, 999999999).
3. **Menu content translation fallback:** requested locale → restaurant default locale → first available. A missing translation renders the fallback with `lang` set on that element (correct font and direction).
4. **Dates and times:** `Intl.DateTimeFormat` with time zone `Africa/Tunis` (from `restaurants.timezone`), 24-hour clock, Latin digits in every locale.
5. **Search:** client-side, over the already-loaded menu, lazy-loaded on focus.
   - Normalisation `normalizeForSearch(text, locale)`:
     - lowercase; strip Latin diacritics (NFD + remove combining marks);
     - Arabic: remove tashkeel and tatweel, unify أ/إ/آ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي, Arabic-Indic digits → Latin.
   - Each product is indexed in all its languages plus its tags.
   - Matching: `@leeoniya/ufuzzy` (typo-tolerant), with prefix matches ranked first. Unit tests use real menu terms in FR/AR/derja.
6. **RTL:**
   - only logical properties (`ms-*`, `me-*`, `ps-*`, `start-*`, `text-start`); an ESLint/stylelint rule bans physical `left/right/ml/mr/pl/pr` classes;
   - directional icons get a `rtl:-scale-x-100` utility;
   - `dir` is set on `<html>`, and mixed-direction content is isolated with `<bdi>`.

## Consequences

- Prices and search behave identically in every locale and are covered by tests.
