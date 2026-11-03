import { z } from 'zod';
import { emailSchema } from '@/features/auth';
import { normalizePairingCode } from '../services/pairing-code';

/** Error values are message keys under `common.forms.errors` or `team.errors`. */

export const DEVICE_MODES = ['fixed', 'mobile'] as const;
export const INVITABLE_ROLES = ['manager', 'counter', 'waiter'] as const;

export const deviceLabelSchema = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .max(40, { error: 'tooLong' });

export const pairingRequestSchema = z.object({
  label: deviceLabelSchema,
  mode: z.enum(DEVICE_MODES),
});
export type PairingRequest = z.infer<typeof pairingRequestSchema>;

export const deviceUpdateSchema = pairingRequestSchema.extend({ deviceId: z.uuid() });
export type DeviceUpdate = z.infer<typeof deviceUpdateSchema>;

export const pairingCodeSchema = z
  .string()
  .max(20, { error: 'pairingCodeInvalid' })
  .transform((value, context) => {
    const code = normalizePairingCode(value);
    if (!code) {
      context.addIssue({ code: 'custom', message: 'pairingCodeInvalid' });
      return z.NEVER;
    }
    return code;
  });

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES),
});
export type Invite = z.infer<typeof inviteSchema>;

export const idSchema = z.uuid();
