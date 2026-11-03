/**
 * Monthly AI quotas (ADR-0025 §5): per-feature unit limits from `plans.ai_limits` plus a cost
 * cap in millimes. Checked before any call; usage only counts successful calls.
 */

export type AiFeature = 'menu_import' | 'translation';

export interface AiLimits {
  photoImports: number;
  translatedItems: number;
  capMillimes: number;
}

export interface AiUsageThisMonth {
  photoImports: number;
  translatedItems: number;
  costMillimes: number;
}

export type QuotaBlock = 'photoImports' | 'translatedItems' | 'cost';

/** Reads `plans.ai_limits` defensively: missing or odd values mean 0 (blocked). */
export function aiLimitsOf(aiLimits: unknown, capMillimes: number): AiLimits {
  const value = (key: string) => {
    const raw = (aiLimits as Record<string, unknown> | null | undefined)?.[key];
    return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0;
  };
  return {
    photoImports: value('photo_imports'),
    translatedItems: value('translated_items'),
    capMillimes,
  };
}

/** `null` when the request fits, otherwise what blocks it. */
export function quotaBlock(
  limits: AiLimits,
  used: AiUsageThisMonth,
  request: { feature: AiFeature; units: number },
): QuotaBlock | null {
  if (used.costMillimes >= limits.capMillimes) return 'cost';
  if (request.feature === 'menu_import' && used.photoImports + 1 > limits.photoImports) {
    return 'photoImports';
  }
  if (
    request.feature === 'translation' &&
    used.translatedItems + request.units > limits.translatedItems
  ) {
    return 'translatedItems';
  }
  return null;
}
