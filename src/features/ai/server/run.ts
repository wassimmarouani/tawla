import 'server-only';
import type { Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { log } from '@/lib/log';
import { recordedFetcher } from '../evals/recorded-fetcher';
import { aiQuotaState, loadGlossary, logAiUsage } from '@/server/admin/ai-usage';
import type { MenuDraft } from '../schemas/menu-draft';
import type { TranslationSource, TranslationSuggestion } from '../schemas/translations';
import { extractMenuFromImages, translateMenuItems, type AiOutcome } from '../services/pipeline';
import { costMillimes } from '../services/pricing';
import { quotaBlock, type AiFeature } from '../services/quota';

/**
 * Server side of AI features (ADR-0025 §4–6, ADR-0030): key from env, quota before the call,
 * usage logged after a successful call, typed errors for the UI. Callers have checked
 * `menu.edit` for `restaurantId`.
 */

export interface AiScope {
  restaurantId: string;
  actorId: string;
}

/**
 * Recorded answers (E2E, keyless demos) never apply to a hosted environment: those are served
 * over HTTPS. E2E runs the production build on http://localhost, hence no NODE_ENV check.
 */
const recorded = env.AI_RECORDED_RESPONSES && !env.NEXT_PUBLIC_APP_URL.startsWith('https://');

function provider(model: string) {
  if (recorded) return { apiKey: 'recorded', model, fetcher: recordedFetcher };
  if (!env.GEMINI_API_KEY) {
    throw new AppError('AI_UNAVAILABLE', 'GEMINI_API_KEY is not set', { reason: 'notConfigured' });
  }
  return { apiKey: env.GEMINI_API_KEY, model };
}

async function guard(scope: AiScope, feature: AiFeature, units: number) {
  const { limits, used } = await aiQuotaState(scope.restaurantId);
  const block = quotaBlock(limits, used, { feature, units });
  if (block) throw new AppError('AI_QUOTA_EXCEEDED', 'AI quota reached', { reason: block });
}

async function settle<T>(
  scope: AiScope,
  feature: AiFeature,
  model: string,
  units: number,
  outcome: AiOutcome<T>,
): Promise<T> {
  if (!outcome.ok) {
    log.warn('ai.failed', { feature, model, error: outcome.error });
    const code =
      outcome.error === 'refused'
        ? 'AI_REFUSED'
        : outcome.error === 'invalid_output'
          ? 'AI_INVALID_OUTPUT'
          : 'AI_UNAVAILABLE';
    throw new AppError(code, `AI ${feature} failed`, { reason: outcome.error });
  }
  await logAiUsage({
    restaurantId: scope.restaurantId,
    actorId: scope.actorId,
    feature,
    model,
    inputTokens: outcome.usage.inputTokens,
    outputTokens: outcome.usage.outputTokens,
    costMillimes: costMillimes(model, outcome.usage.inputTokens, outcome.usage.outputTokens),
    units,
  });
  return outcome.value;
}

/** Photo(s) of a paper menu → editable draft (never published automatically). */
export async function runMenuImport(
  scope: AiScope,
  images: readonly { mimeType: string; base64: string }[],
  fallback: Locale,
): Promise<MenuDraft> {
  const config = provider(env.AI_MODEL_EXTRACT);
  await guard(scope, 'menu_import', 1);
  const model = config.model;
  const outcome = await extractMenuFromImages(config, images, fallback);
  return settle(scope, 'menu_import', model, 1, outcome);
}

/** Missing languages → suggestions the owner accepts one by one or all at once. */
export async function runTranslation(
  scope: AiScope,
  items: readonly TranslationSource[],
  targets: readonly Locale[],
): Promise<TranslationSuggestion[]> {
  const config = provider(env.AI_MODEL_TRANSLATE);
  await guard(scope, 'translation', items.length);
  const model = config.model;
  const glossary = await loadGlossary(scope.restaurantId);
  const outcome = await translateMenuItems(config, items, targets, glossary);
  return settle(scope, 'translation', model, items.length, outcome);
}

/** Remaining quota for the UI ("2 imports left this month"). */
export async function aiAllowance(restaurantId: string) {
  const { limits, used } = await aiQuotaState(restaurantId);
  return {
    configured: recorded || Boolean(env.GEMINI_API_KEY),
    importsLeft: Math.max(0, limits.photoImports - used.photoImports),
    itemsLeft: Math.max(0, limits.translatedItems - used.translatedItems),
    capReached: used.costMillimes >= limits.capMillimes,
  };
}
