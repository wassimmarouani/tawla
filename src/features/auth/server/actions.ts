'use server';

import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth/next-path';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { actionOk, validationError, type ActionResult } from '@/lib/errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  emailSchema,
  logInSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  tokenHashSchema,
  type LogIn,
  type PasswordResetRequest,
  type PasswordUpdate,
} from '../schemas/auth';
import { authFailure } from './auth-errors';
import { authThrottle } from '@/lib/auth/throttle';

/**
 * Owner/manager authentication (ADR-0010 §1, P0-11). Attempts are limited per IP and per email
 * before reaching Supabase Auth (authThrottle, P1-09).
 */

export async function logIn(input: LogIn, next?: string): Promise<ActionResult> {
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const throttled = await authThrottle(parsed.data.email);
  if (throttled) return throttled;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authFailure(error, 'login');
  redirect(safeNextPath(next));
}

export async function logOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}

/** Sends a new confirmation email. Always succeeds unless throttled (no account enumeration). */
export async function resendConfirmation(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return validationError(parsed.error);
  const throttled = await authThrottle(parsed.data);
  if (throttled) return throttled;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/signup/confirm` },
  });
  if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
    return authFailure(error, 'resend');
  }
  return actionOk();
}

/** Sends a reset link. Same answer whether or not the account exists. */
export async function requestPasswordReset(input: PasswordResetRequest): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const throttled = await authThrottle(parsed.data.email);
  if (throttled) return throttled;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset/confirm`,
  });
  if (error?.code === 'over_email_send_rate_limit' || error?.code === 'over_request_rate_limit') {
    return authFailure(error, 'reset_request');
  }
  return actionOk();
}

/**
 * Exchanges the recovery link token for a session, on an explicit click: the GET page stays
 * side-effect free and mail scanners that prefetch links cannot burn the token.
 */
export async function confirmRecovery(tokenHash: string): Promise<ActionResult> {
  const parsed = tokenHashSchema.safeParse(tokenHash);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: parsed.data });
  if (error) return authFailure(error, 'reset_confirm');
  redirect('/reset/new');
}

export async function updatePassword(input: PasswordUpdate): Promise<ActionResult> {
  const parsed = passwordUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const claims = await getSessionClaims();
  if (!claims) redirect('/reset');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return authFailure(error, 'password_update');
  // Invited counter/waiter staff work on the staff app, not the back-office.
  const managesSomething = claims.memberships.some(
    (membership) => membership.role === 'owner' || membership.role === 'manager',
  );
  redirect(claims.memberships.length > 0 && !managesSomething ? '/staff' : '/dashboard');
}
