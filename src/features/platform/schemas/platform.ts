import { z } from 'zod';
import { FEATURE_KEYS } from '@/lib/flags';

/** Super Admin inputs (P1-15). Error values are message keys under `admin.errors`. */

/** Plan features plus platform-only switches (ADR-0015, ADR-0025 §5). */
export const OVERRIDE_KEYS = [...FEATURE_KEYS, 'ai_unlimited'] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export const overrideInputSchema = z.object({
  restaurantId: z.uuid(),
  key: z.enum(OVERRIDE_KEYS),
  enabled: z.boolean(),
  /** `YYYY-MM-DD`, end of that day in Tunis; empty = no expiry. */
  expiresOn: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, { error: 'dateInvalid' })
    .transform((value) => (value ? new Date(`${value}T23:59:59+01:00`) : null)),
  reason: z.string().trim().min(3, { error: 'reasonRequired' }).max(500),
});
export type OverrideInput = z.input<typeof overrideInputSchema>;

export const planInputSchema = z.object({
  restaurantId: z.uuid(),
  plan: z.string().regex(/^[a-z_]{2,32}$/),
});
export type PlanInput = z.infer<typeof planInputSchema>;

export const totpCodeSchema = z.object({
  factorId: z.uuid(),
  code: z.string().regex(/^\d{6}$/, { error: 'codeInvalid' }),
});
export type TotpCode = z.infer<typeof totpCodeSchema>;
