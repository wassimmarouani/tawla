'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authFailure, logInSchema, tokenHashSchema, type LogIn } from '@/features/auth';
import { sessionClaimsSchema } from '@/lib/auth/claims';
import { getSessionClaims } from '@/lib/auth/session';
import { authThrottle } from '@/lib/auth/throttle';
import { AppError, actionError, validationError, type ActionResult } from '@/lib/errors';
import { clientIp } from '@/lib/http/client-ip';
import { RATE_RULES, rateLimiter } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  acceptInvitations,
  claimPairingCode,
  endOwnStaffSessions,
  startStaffSession,
} from '@/server/admin/staff-access';
import { pairingCodeSchema } from '../schemas/staff';
import { currentDevice } from './context';
import { writeDeviceToken } from './device-cookie';

/* Staff surface Server Actions (ADR-0010 Phase 1): pairing, email login on a paired device. */

/** Redeems a pairing code typed (or opened from the QR) on this device. */
export async function pairDevice(code: string): Promise<ActionResult> {
  const parsed = pairingCodeSchema.safeParse(code);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid code',
        details: { fields: { code: 'pairingCodeInvalid' } },
      },
    };
  }
  const limit = await rateLimiter().hit(RATE_RULES.authIp, clientIp(await headers()));
  if (!limit.ok) return actionError('RATE_LIMITED', 'Too many pairing attempts', 'rateLimited');
  try {
    const { token } = await claimPairingCode(parsed.data);
    await writeDeviceToken(token);
  } catch (error) {
    if (error instanceof AppError && error.code === 'PAIRING_CODE_INVALID') {
      return {
        ok: false,
        error: {
          code: 'PAIRING_CODE_INVALID',
          message: error.message,
          details: { fields: { code: 'pairingCodeInvalid' } },
        },
      };
    }
    throw error;
  }
  redirect('/staff/login');
}

/**
 * Email login on a paired device (Phase 1: managers and invited staff). Only members of the
 * device's restaurant may start a session there.
 */
export async function staffLogIn(input: LogIn): Promise<ActionResult> {
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const device = await currentDevice();
  if (!device) redirect('/staff/pair');
  const throttled = await authThrottle(parsed.data.email);
  if (throttled) return throttled;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authFailure(error, 'staff_login');
  const verified = await supabase.auth.getClaims(data.session.access_token);
  const claims = sessionClaimsSchema.safeParse(verified.data?.claims);
  const session = await startStaffSession({
    device,
    userId: data.user.id,
    authSessionId: claims.success ? (claims.data.session_id ?? null) : null,
  });
  if (!session) {
    await supabase.auth.signOut({ scope: 'local' });
    return actionError('FORBIDDEN', 'Not a member of this venue', 'notMember');
  }
  redirect('/staff');
}

export async function staffLogOut(): Promise<void> {
  const device = await currentDevice();
  const claims = await getSessionClaims();
  if (device && claims) await endOwnStaffSessions({ deviceId: device.id, userId: claims.sub });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect(device ? '/staff/login' : '/staff/pair');
}

/**
 * Invitation link (spec 04): exchanges the token on an explicit click (the GET page has no side
 * effect), turns pending invitations into memberships, then asks for a password.
 */
export async function acceptInvite(tokenHash: string): Promise<ActionResult> {
  const parsed = tokenHashSchema.safeParse(tokenHash);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'invite',
    token_hash: parsed.data,
  });
  if (error) return authFailure(error, 'invite_accept');
  const { user } = data;
  if (!user?.email) return actionError('SESSION_EXPIRED', 'No user behind the link', 'linkExpired');
  const roles = await acceptInvitations({ userId: user.id, email: user.email });
  if (roles.length === 0) {
    await supabase.auth.signOut({ scope: 'local' });
    return actionError('NOT_FOUND', 'Invitation expired or revoked', 'invitationExpired');
  }
  // New access token: the hook adds the membership claims.
  await supabase.auth.refreshSession();
  redirect('/reset/new');
}
