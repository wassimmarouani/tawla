import { z } from 'zod';
import { LOCALES } from '@/i18n/locales';
import { MAX_BULK_TABLES, MAX_TABLE_NUMBER } from '../services/table-numbers';

const idSchema = z.uuid();
const numberSchema = z.int().min(1).max(MAX_TABLE_NUMBER);
const labelSchema = z
  .string()
  .trim()
  .max(40, 'tooLong')
  .transform((value) => (value === '' ? null : value));

/** One table: number, optional label ("Bar", "Terrasse 3"), optional zone. */
export const tableInputSchema = z.object({
  number: numberSchema,
  label: labelSchema,
  zoneId: idSchema.nullable(),
});
export type TableInput = z.input<typeof tableInputSchema>;

/** Tables `from`…`to` (1–30 at once) in one zone. */
export const tableRangeSchema = z
  .object({ from: numberSchema, to: numberSchema, zoneId: idSchema.nullable() })
  .refine((range) => range.to >= range.from, { message: 'rangeReversed', path: ['to'] })
  .refine((range) => range.to - range.from < MAX_BULK_TABLES, {
    message: 'rangeTooLarge',
    path: ['to'],
  });
export type TableRange = z.input<typeof tableRangeSchema>;

/** A number as typed in the form (`12`). */
export const numberTextSchema = z.string().transform((value, context) => {
  const text = value.trim();
  const number = /^\d{1,3}$/.test(text) ? Number(text) : Number.NaN;
  if (!(number >= 1 && number <= MAX_TABLE_NUMBER)) {
    context.addIssue({ code: 'custom', message: 'numberInvalid' });
    return z.NEVER;
  }
  return number;
});

const zoneText = z.string().trim().max(60, 'tooLong').optional();

/** Zone name per locale; at least one. */
export const zoneInputSchema = z.object({
  name: z
    .object({ fr: zoneText, ar: zoneText, en: zoneText })
    .transform((draft) => {
      const name: Partial<Record<(typeof LOCALES)[number], string>> = {};
      for (const locale of LOCALES) {
        const value = draft[locale];
        if (value) name[locale] = value;
      }
      return name;
    })
    .refine((name) => Object.keys(name).length > 0, { message: 'required' }),
});
export type ZoneInput = z.input<typeof zoneInputSchema>;

export const idsSchema = z
  .array(idSchema)
  .min(1)
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'duplicate' });
