import { z } from 'zod';

/** Supabase Auth minimum (supabase/config.toml) and bcrypt's 72-byte input limit. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

/** Error values are message keys under `common.forms.errors`. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: 'required' })
  .max(254, { error: 'emailInvalid' })
  .pipe(z.email({ error: 'emailInvalid' }));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'passwordTooShort' })
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    error: 'passwordTooLong',
  });

export const logInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'required' }).max(1024, { error: 'passwordTooLong' }),
});
export type LogIn = z.infer<typeof logInSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

export const passwordUpdateSchema = z
  .object({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'passwordMismatch',
  });
export type PasswordUpdate = z.infer<typeof passwordUpdateSchema>;

/** Token from an email link (`?token_hash=…`), exchanged only on an explicit POST. */
export const tokenHashSchema = z.string().regex(/^[\w-]{16,256}$/);
