import { z } from 'zod';
import { LOCALES } from '@/i18n/locales';

/** Translation of menu texts (ADR-0025 §2): suggestions the owner accepts, never auto-applied. */

export const translationSourceSchema = z.object({
  /** `product:<uuid>` or `category:<uuid>`. */
  id: z.string().regex(/^(product|category):[0-9a-f-]{36}$/),
  name: z.partialRecord(z.enum(LOCALES), z.string().max(120)),
  description: z.partialRecord(z.enum(LOCALES), z.string().max(400)).nullable(),
});
export type TranslationSource = z.infer<typeof translationSourceSchema>;

export const rawTranslationsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(80),
        locale: z.enum(LOCALES),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(400).nullable().catch(null),
      }),
    )
    .max(2000),
});
export type RawTranslations = z.infer<typeof rawTranslationsSchema>;

export const RAW_TRANSLATIONS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          locale: { type: 'STRING', enum: [...LOCALES] },
          name: { type: 'STRING' },
          description: { type: 'STRING', nullable: true },
        },
        required: ['id', 'locale', 'name', 'description'],
      },
    },
  },
  required: ['items'],
} as const;

export const translationSuggestionSchema = z.object({
  id: translationSourceSchema.shape.id,
  locale: z.enum(LOCALES),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).nullable(),
});
export type TranslationSuggestion = z.infer<typeof translationSuggestionSchema>;
