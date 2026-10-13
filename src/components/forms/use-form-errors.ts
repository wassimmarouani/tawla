'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { ActionError } from '@/lib/errors';

const FIELD_ERROR_KEYS = [
  'required',
  'emailInvalid',
  'passwordTooShort',
  'passwordTooLong',
  'passwordMismatch',
  'tooLong',
] as const;
type FieldErrorKey = (typeof FIELD_ERROR_KEYS)[number];

const REASON_KEYS = [
  'invalidCredentials',
  'emailNotConfirmed',
  'rateLimited',
  'passwordWeak',
  'passwordSame',
  'linkExpired',
  'unexpected',
] as const;
export type ReasonKey = (typeof REASON_KEYS)[number];

function isFieldErrorKey(key: string): key is FieldErrorKey {
  return (FIELD_ERROR_KEYS as readonly string[]).includes(key);
}

function isReasonKey(key: unknown): key is ReasonKey {
  return typeof key === 'string' && (REASON_KEYS as readonly string[]).includes(key);
}

/**
 * Translates Zod message keys (field errors) and action reasons into user-facing text
 * (CLAUDE.md rule 5: no hard-coded strings, even in validation).
 */
export function useFormErrors() {
  const tForms = useTranslations('common.forms');
  const tAuth = useTranslations('auth.errors');

  const fieldError = useCallback(
    (key: string | undefined): string | undefined => {
      if (!key) return undefined;
      return isFieldErrorKey(key) ? tForms(`errors.${key}`) : tAuth('unexpected');
    },
    [tForms, tAuth],
  );

  const reasonText = useCallback(
    (error: ActionError): string => {
      const reason = error.details?.reason;
      if (isReasonKey(reason)) return tAuth(reason);
      return error.code === 'RATE_LIMITED' ? tAuth('rateLimited') : tAuth('unexpected');
    },
    [tAuth],
  );

  return { fieldError, reasonText };
}
