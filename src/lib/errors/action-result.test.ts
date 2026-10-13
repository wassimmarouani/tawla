import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { actionError, actionOk, validationError } from './action-result';

describe('action results', () => {
  it('wraps success data', () => {
    expect(actionOk()).toEqual({ ok: true, data: undefined });
    expect(actionOk({ slug: 'cafe' })).toEqual({ ok: true, data: { slug: 'cafe' } });
  });

  it('builds errors with an optional reason key', () => {
    expect(actionError('RATE_LIMITED', 'Too many attempts')).toEqual({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts' },
    });
    expect(actionError('UNAUTHENTICATED', 'Bad credentials', 'invalidCredentials')).toEqual({
      ok: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Bad credentials',
        details: { reason: 'invalidCredentials' },
      },
    });
  });

  it('keeps the first message key of each field', () => {
    const schema = z.object({
      email: z
        .string()
        .min(1, { error: 'required' })
        .pipe(z.email({ error: 'emailInvalid' })),
      password: z.string().min(10, { error: 'passwordTooShort' }),
    });
    const parsed = schema.safeParse({ email: '', password: 'short' });
    if (parsed.success) throw new Error('expected a validation failure');
    expect(validationError(parsed.error)).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input',
        details: { fields: { email: 'required', password: 'passwordTooShort' } },
      },
    });
  });

  it('files root-level issues under "form"', () => {
    const parsed = z.string().safeParse(1);
    if (parsed.success) throw new Error('expected a validation failure');
    const result = validationError(parsed.error);
    expect(!result.ok && result.error.details?.fields).toHaveProperty('form');
  });
});
