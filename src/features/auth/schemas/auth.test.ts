import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  logInSchema,
  newPasswordSchema,
  passwordUpdateSchema,
  tokenHashSchema,
} from './auth';

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe('auth schemas', () => {
  it('normalizes emails and reports message keys', () => {
    expect(emailSchema.parse('  Owner@Example.ORG ')).toBe('owner@example.org');
    expect(firstMessage(emailSchema.safeParse(''))).toBe('required');
    expect(firstMessage(emailSchema.safeParse('not-an-email'))).toBe('emailInvalid');
    expect(firstMessage(emailSchema.safeParse(`${'a'.repeat(250)}@x.tn`))).toBe('emailInvalid');
  });

  it('enforces 10 characters and 72 bytes for new passwords', () => {
    expect(newPasswordSchema.safeParse('correct-horse').success).toBe(true);
    expect(firstMessage(newPasswordSchema.safeParse('short'))).toBe('passwordTooShort');
    // 36 Arabic letters = 72 bytes (ok); 37 = 74 bytes (too long for bcrypt).
    expect(newPasswordSchema.safeParse('ب'.repeat(36)).success).toBe(true);
    expect(firstMessage(newPasswordSchema.safeParse('ب'.repeat(37)))).toBe('passwordTooLong');
  });

  it('accepts any non-empty password at login (legacy accounts)', () => {
    expect(logInSchema.safeParse({ email: 'a@b.tn', password: 'x' }).success).toBe(true);
    expect(firstMessage(logInSchema.safeParse({ email: 'a@b.tn', password: '' }))).toBe('required');
  });

  it('requires matching confirmation', () => {
    const result = passwordUpdateSchema.safeParse({
      password: 'correct-horse-battery',
      confirmPassword: 'correct-horse-battery!',
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'passwordMismatch',
    });
  });

  it('accepts only token-like hashes', () => {
    expect(tokenHashSchema.safeParse('a'.repeat(56)).success).toBe(true);
    expect(tokenHashSchema.safeParse('pkce_0123456789abcdef').success).toBe(true);
    expect(tokenHashSchema.safeParse('short').success).toBe(false);
    expect(tokenHashSchema.safeParse('a'.repeat(30) + '<script>').success).toBe(false);
  });
});
