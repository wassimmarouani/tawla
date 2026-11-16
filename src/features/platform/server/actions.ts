'use server';

import { refresh, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { menuCacheTags } from '@/features/menu';
import { getSessionClaims } from '@/lib/auth/session';
import { AppError, actionError, actionOk, validationError, type ActionResult } from '@/lib/errors';
import { log } from '@/lib/log';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_VENUES, installDemoVenue } from '@/server/admin/demo-venue';
import { DEMOS_CACHE_TAG } from '@/server/admin/public-demos';
import { assignPlan as writePlan, removeOverride, setOverride } from '@/server/admin/platform';
import {
  overrideInputSchema,
  planInputSchema,
  totpCodeSchema,
  type OverrideInput,
  type PlanInput,
  type TotpCode,
} from '../schemas/platform';

/* Super Admin Server Actions (P1-15): TOTP enrolment, plan and flag overrides (audited). */

async function platformWrite(operation: string, write: () => Promise<void>): Promise<ActionResult> {
  try {
    await write();
    refresh();
    return actionOk();
  } catch (error) {
    if (error instanceof AppError) {
      const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
      return actionError(error.code, error.message, reason);
    }
    log.error('platform.action_failed', { operation, cause: String(error) });
    return actionError('INTERNAL', 'Platform action failed', 'unexpected');
  }
}

export async function assignPlan(input: PlanInput): Promise<ActionResult> {
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const claims = await getSessionClaims();
  return platformWrite('platform.plan', () =>
    writePlan(claims, parsed.data.restaurantId, parsed.data.plan),
  );
}

export async function saveOverride(input: OverrideInput): Promise<ActionResult> {
  const parsed = overrideInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const claims = await getSessionClaims();
  return platformWrite('platform.override', () =>
    setOverride(claims, {
      restaurantId: parsed.data.restaurantId,
      key: parsed.data.key,
      enabled: parsed.data.enabled,
      expiresAt: parsed.data.expiresOn,
      reason: parsed.data.reason,
    }),
  );
}

export async function deleteOverride(input: {
  restaurantId: string;
  overrideId: string;
}): Promise<ActionResult> {
  const parsed = z.object({ restaurantId: z.uuid(), overrideId: z.uuid() }).safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const claims = await getSessionClaims();
  return platformWrite('platform.override_remove', () =>
    removeOverride(claims, parsed.data.restaurantId, parsed.data.overrideId),
  );
}

/** Installs (or completes) every sales demo venue, owned by the calling Super Admin. */
export async function installDemo(): Promise<ActionResult> {
  const claims = await getSessionClaims();
  return platformWrite('platform.demo_install', async () => {
    await installDemoVenue(claims);
    // Public menu cache per demo + the landing's demos list (read via cacheTag('demos')).
    updateTag(DEMOS_CACHE_TAG);
    for (const definition of DEMO_VENUES) {
      for (const tag of menuCacheTags(definition.slug)) updateTag(tag);
    }
  });
}

/**
 * Starts TOTP enrolment (ADR-0005: mandatory for platform roles). Unverified leftovers from an
 * abandoned attempt are removed first. Returns the QR code (SVG data URL) and the secret.
 */
export async function startTotpEnrolment(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const claims = await getSessionClaims();
  if (!claims || claims.platform_role === 'none') {
    return actionError('FORBIDDEN', 'Platform role required');
  }
  const supabase = await createSupabaseServerClient();
  const factors = await supabase.auth.mfa.listFactors();
  for (const factor of factors.data?.all ?? []) {
    if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Taply ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) {
    log.error('platform.totp_enrol_failed', { code: error.code ?? null });
    return actionError('INTERNAL', 'Enrolment failed', 'unexpected');
  }
  return actionOk({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
}

/** Verifies a TOTP code: the session becomes `aal2` and the console opens. */
export async function verifyTotp(input: TotpCode): Promise<ActionResult> {
  const parsed = totpCodeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (error) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid code',
        details: { fields: { code: 'codeInvalid' } },
      },
    };
  }
  redirect('/admin');
}
