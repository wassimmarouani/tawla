import type { AuthError } from '@supabase/supabase-js';
import { actionError, type ActionResult } from '@/lib/errors';
import { log } from '@/lib/log';

/**
 * Maps Supabase Auth errors to action errors with a UI message key (`auth.errors.*`).
 * Unknown errors are logged and returned as INTERNAL without their message.
 */
export function authFailure(error: AuthError, operation: string): ActionResult<never> {
  switch (error.code) {
    case 'invalid_credentials':
      return actionError('UNAUTHENTICATED', 'Invalid credentials', 'invalidCredentials');
    case 'email_not_confirmed':
      return actionError('UNAUTHENTICATED', 'Email not confirmed', 'emailNotConfirmed');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return actionError('RATE_LIMITED', 'Auth rate limit', 'rateLimited');
    case 'weak_password':
      return actionError('VALIDATION_FAILED', 'Weak password', 'passwordWeak');
    case 'same_password':
      return actionError('VALIDATION_FAILED', 'Same password', 'passwordSame');
    case 'otp_expired':
    case 'otp_disabled':
    case 'bad_jwt':
      return actionError('SESSION_EXPIRED', 'Link expired or already used', 'linkExpired');
    default:
      log.error('auth.failure', { operation, code: error.code ?? null, status: error.status });
      return actionError('INTERNAL', 'Unexpected auth error', 'unexpected');
  }
}
