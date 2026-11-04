import { z } from 'zod';

/**
 * Menu extracted from photos (ADR-0025 §2, ADR-0030 §3). `rawMenuSchema` is what the model must
 * return (prices as printed); `MenuDraft` is the normalised, editable draft shown to the owner.
 * Never published automatically.
 */

export const CONFIDENCES = ['high', 'medium', 'low'] as const;

const text = (max: number) => z.string().trim().max(max);

export const rawMenuSchema = z.object({
  language: z.enum(['fr', 'ar', 'en', 'mixed']).catch('mixed'),
  categories: z
    .array(
      z.object({
        name: text(80),
        items: z
          .array(
            z.object({
              name: text(120),
              description: text(400).nullable().catch(null),
              price: text(40).nullable().catch(null),
              confidence: z.enum(CONFIDENCES).catch('low'),
            }),
          )
          .max(200),
      }),
    )
    .max(40),
});
export type RawMenu = z.infer<typeof rawMenuSchema>;

/** Gemini `responseSchema` (OpenAPI subset) mirroring `rawMenuSchema`. */
export const RAW_MENU_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    language: { type: 'STRING', enum: ['fr', 'ar', 'en', 'mixed'] },
    categories: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                description: { type: 'STRING', nullable: true },
                price: { type: 'STRING', nullable: true },
                confidence: { type: 'STRING', enum: [...CONFIDENCES] },
              },
              required: ['name', 'description', 'price', 'confidence'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  required: ['language', 'categories'],
} as const;

export const draftProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).nullable(),
  /** As printed on the menu, kept for the owner's check. */
  priceText: z.string().max(40).nullable(),
  /** Integer millimes, `null` when the printed price could not be read. */
  price: z.int().min(0).nullable(),
  confidence: z.enum(CONFIDENCES),
  include: z.boolean(),
});
export type DraftProduct = z.infer<typeof draftProductSchema>;

export const menuDraftSchema = z.object({
  language: z.enum(['fr', 'ar', 'en']),
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        products: z.array(draftProductSchema).max(200),
      }),
    )
    .max(40),
});
export type MenuDraft = z.infer<typeof menuDraftSchema>;
