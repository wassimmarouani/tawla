import type { Locale } from '@/i18n/locales';
import { generateJson, type GeminiPart, type GeminiUsage } from '../providers/gemini';
import { RAW_MENU_RESPONSE_SCHEMA, rawMenuSchema, type MenuDraft } from '../schemas/menu-draft';
import {
  RAW_TRANSLATIONS_RESPONSE_SCHEMA,
  rawTranslationsSchema,
  type TranslationSource,
  type TranslationSuggestion,
} from '../schemas/translations';
import { normalizeDraft } from './draft';
import { extractionPrompt, translationPrompt, usefulSuggestions } from './prompts';

/**
 * Provider calls behind the ADR-0025 interface: `extractMenuFromImages` and
 * `translateMenuItems`. No env or database here (the server layer adds keys, quotas and usage
 * logging), so the eval script and tests run the exact same code.
 */

export type AiError = 'refused' | 'invalid_output' | 'unavailable';

export type AiOutcome<T> =
  | { ok: true; value: T; usage: GeminiUsage; raw: unknown }
  | { ok: false; error: AiError; usage: GeminiUsage };

export interface ProviderConfig {
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
}

export const MAX_IMPORT_IMAGES = 6;

export async function extractMenuFromImages(
  config: ProviderConfig,
  images: readonly { mimeType: string; base64: string }[],
  fallback: Locale,
): Promise<AiOutcome<MenuDraft>> {
  const parts: GeminiPart[] = [
    { text: extractionPrompt() },
    ...images
      .slice(0, MAX_IMPORT_IMAGES)
      .map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.base64 } })),
  ];
  const result = await generateJson(
    {
      apiKey: config.apiKey,
      model: config.model,
      parts,
      responseSchema: RAW_MENU_RESPONSE_SCHEMA,
      maxOutputTokens: 32_768,
    },
    config.fetcher,
  );
  if (!result.ok) return result;
  const raw = rawMenuSchema.safeParse(result.json);
  if (!raw.success) return { ok: false, error: 'invalid_output', usage: result.usage };
  return {
    ok: true,
    value: normalizeDraft(raw.data, fallback),
    usage: result.usage,
    raw: result.json,
  };
}

export async function translateMenuItems(
  config: ProviderConfig,
  items: readonly TranslationSource[],
  targets: readonly Locale[],
  glossary: readonly { term: string; translations: Partial<Record<Locale, string>> }[],
): Promise<AiOutcome<TranslationSuggestion[]>> {
  const result = await generateJson(
    {
      apiKey: config.apiKey,
      model: config.model,
      parts: [{ text: translationPrompt(items, targets, glossary) }],
      responseSchema: RAW_TRANSLATIONS_RESPONSE_SCHEMA,
      thinkingBudget: 0,
      maxOutputTokens: 32_768,
    },
    config.fetcher,
  );
  if (!result.ok) return result;
  const raw = rawTranslationsSchema.safeParse(result.json);
  if (!raw.success) return { ok: false, error: 'invalid_output', usage: result.usage };
  const suggestions = usefulSuggestions(raw.data, items, targets);
  return { ok: true, value: suggestions, usage: result.usage, raw: result.json };
}
