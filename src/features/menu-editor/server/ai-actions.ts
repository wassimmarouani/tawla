'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';
import {
  MAX_IMPORT_IMAGES,
  menuDraftSchema,
  runMenuImport,
  runTranslation,
  translationSuggestionSchema,
  type MenuDraft,
  type TranslationSource,
  type TranslationSuggestion,
} from '@/features/ai';
import { withBackofficeAccess } from '@/features/backoffice';
import { menuCacheTags } from '@/features/menu';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import { AppError, validationError, type ActionResult } from '@/lib/errors';
import { applyTranslations, importDraft, loadTranslationSources } from './ai-mutations';

/* AI Server Actions of the menu editor (P1-13, ADR-0025, ADR-0030): menu.edit, quotas server-side. */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Photos of the paper menu (resized in the browser) → editable draft. */
export async function extractMenuDraft(formData: FormData): Promise<ActionResult<MenuDraft>> {
  const files = formData.getAll('photos').filter((value): value is File => value instanceof File);
  return withBackofficeAccess('menu.edit', 'ai.menu_import', async ({ scope, restaurant }) => {
    if (files.length === 0 || files.length > MAX_IMPORT_IMAGES) {
      throw new AppError('VALIDATION_FAILED', 'Between 1 and 6 photos', { reason: 'photoCount' });
    }
    const images = await Promise.all(
      files.map(async (file) => {
        if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
          throw new AppError('VALIDATION_FAILED', 'Unsupported photo', { reason: 'photoType' });
        }
        return {
          mimeType: file.type,
          base64: Buffer.from(await file.arrayBuffer()).toString('base64'),
        };
      }),
    );
    const fallback = isLocale(restaurant.defaultLocale) ? restaurant.defaultLocale : DEFAULT_LOCALE;
    return runMenuImport(
      { restaurantId: scope.restaurantId, actorId: scope.claims.sub },
      images,
      fallback,
    );
  });
}

/** Imports the products the owner kept; the menu page shows them right away. */
export async function importMenuDraft(
  draft: MenuDraft,
): Promise<ActionResult<{ categories: number; products: number }>> {
  const parsed = menuDraftSchema.safeParse(draft);
  if (!parsed.success) return validationError(parsed.error);
  return withBackofficeAccess(
    'menu.edit',
    'ai.menu_import_apply',
    async ({ scope, restaurant }) => {
      const result = await importDraft(scope, parsed.data);
      for (const tag of menuCacheTags(restaurant.slug, restaurant.publicId)) updateTag(tag);
      refresh();
      return result;
    },
  );
}

export interface TranslationReview {
  sources: TranslationSource[];
  suggestions: TranslationSuggestion[];
  targets: Locale[];
}

/** Suggestions for every enabled language missing on categories and products. */
export async function suggestTranslations(): Promise<ActionResult<TranslationReview>> {
  return withBackofficeAccess('menu.edit', 'ai.translation', async ({ scope, restaurant }) => {
    const targets = restaurant.locales.filter(isLocale);
    const sources = await loadTranslationSources(scope, targets);
    if (sources.length === 0) return { sources, suggestions: [], targets };
    const suggestions = await runTranslation(
      { restaurantId: scope.restaurantId, actorId: scope.claims.sub },
      sources,
      targets,
    );
    return { sources, suggestions, targets };
  });
}

const suggestionsSchema = z.array(translationSuggestionSchema).min(1).max(1000);

export async function acceptTranslations(
  suggestions: TranslationSuggestion[],
): Promise<ActionResult<number>> {
  const parsed = suggestionsSchema.safeParse(suggestions);
  if (!parsed.success) return validationError(parsed.error);
  return withBackofficeAccess(
    'menu.edit',
    'ai.translation_apply',
    async ({ scope, restaurant }) => {
      const applied = await applyTranslations(scope, parsed.data);
      for (const tag of menuCacheTags(restaurant.slug, restaurant.publicId)) updateTag(tag);
      refresh();
      return applied;
    },
  );
}
