/**
 * AI cost in integer millimes (ADR-0025 §6, ADR-0030 §5). Prices in micro-dollars per million
 * tokens, checked on the provider's pricing page on 2026-11-03. Integer maths only.
 */

export interface ModelPrice {
  /** µ$ per million input tokens (text and images). */
  input: number;
  /** µ$ per million output tokens (thinking included). */
  output: number;
}

export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  'gemini-2.5-flash': { input: 300_000, output: 2_500_000 },
  'gemini-2.5-pro': { input: 1_250_000, output: 10_000_000 },
};

/** Dinars per dollar × 1000, reviewed with the price table (3.100 TND = 1 USD). */
export const MILLIDINARS_PER_DOLLAR = 3100;

/**
 * Cost of one call, rounded up to the next millime. Unknown models are priced like the most
 * expensive entry, so a configuration typo never under-counts.
 */
export function costMillimes(model: string, inputTokens: number, outputTokens: number): number {
  const fallback = Object.values(MODEL_PRICES).reduce((max, price) =>
    price.output > max.output ? price : max,
  );
  const price = MODEL_PRICES[model] ?? fallback;
  // µ$ × 1e6 (prices are per million tokens).
  const microDollarsTimesMillion = inputTokens * price.input + outputTokens * price.output;
  // millimes = µ$ / 1e6 × MILLIDINARS_PER_DOLLAR.
  const denominator = 1_000_000 * 1_000_000;
  return Math.ceil((microDollarsTimesMillion * MILLIDINARS_PER_DOLLAR) / denominator);
}
