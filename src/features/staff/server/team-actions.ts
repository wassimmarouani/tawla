'use server';

import { refresh } from 'next/cache';
import { withBackofficeAccess, type BackofficeAccess } from '@/features/backoffice';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { validationError, type ActionResult } from '@/lib/errors';
import { qrSvg, type QrSvg } from '@/lib/qr/qr-svg';
import {
  createPairingCode,
  endStaffSession,
  inviteStaff,
  revokeDevice,
  revokeInvitation,
  updateDevice,
} from '@/server/admin/staff-access';
import {
  deviceUpdateSchema,
  idSchema,
  inviteSchema,
  pairingRequestSchema,
  type DeviceUpdate,
  type Invite,
  type PairingRequest,
} from '../schemas/staff';

/* Team page Server Actions (P1-11, spec 04 "Staff and devices"): staff.manage (owner, manager). */

async function runTeamAction<T>(
  operation: string,
  write: (access: BackofficeAccess) => Promise<T>,
): Promise<ActionResult<T>> {
  return withBackofficeAccess('staff.manage', operation, async (access) => {
    const data = await write(access);
    refresh();
    return data;
  });
}

export interface PairingTicket {
  code: string;
  expiresAt: string;
  /** `/staff/pair?code=…`, also drawn as a QR code for the device's camera. */
  url: string;
  qr: QrSvg;
}

/** A fresh 8-character code (shown once, with its QR) for the device to pair. */
export async function startPairing(input: PairingRequest): Promise<ActionResult<PairingTicket>> {
  const parsed = pairingRequestSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return withBackofficeAccess('staff.manage', 'team.pairing_start', async ({ scope }) => {
    const { code, expiresAt } = await createPairingCode({
      restaurantId: scope.restaurantId,
      actorId: scope.claims.sub,
      label: parsed.data.label,
      mode: parsed.data.mode,
    });
    const url = `${env.NEXT_PUBLIC_APP_URL}/staff/pair?code=${code}`;
    return { code, expiresAt: expiresAt.toISOString(), url, qr: qrSvg(url) };
  });
}

export async function saveDevice(input: DeviceUpdate): Promise<ActionResult> {
  const parsed = deviceUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runTeamAction('team.device_update', async ({ scope }) => {
    await updateDevice({
      restaurantId: scope.restaurantId,
      actorId: scope.claims.sub,
      ...parsed.data,
    });
    return undefined;
  });
}

export async function revokeDeviceAction(deviceId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(deviceId);
  if (!parsed.success) return validationError(parsed.error);
  return runTeamAction('team.device_revoke', async ({ scope }) => {
    await revokeDevice({
      restaurantId: scope.restaurantId,
      deviceId: parsed.data,
      actorId: scope.claims.sub,
    });
    return undefined;
  });
}

export async function endSessionAction(sessionId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(sessionId);
  if (!parsed.success) return validationError(parsed.error);
  return runTeamAction('team.session_end', async ({ scope }) => {
    await endStaffSession({
      restaurantId: scope.restaurantId,
      sessionId: parsed.data,
      actorId: scope.claims.sub,
    });
    return undefined;
  });
}

/** `locale` is the inviter's UI language, used for the invitation email. */
export async function inviteStaffAction(input: Invite, locale: string): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runTeamAction('team.invite', async ({ scope }) => {
    await inviteStaff({
      restaurantId: scope.restaurantId,
      actorId: scope.claims.sub,
      email: parsed.data.email,
      role: parsed.data.role,
      locale: isLocale(locale) ? locale : DEFAULT_LOCALE,
    });
    return undefined;
  });
}

export async function revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(invitationId);
  if (!parsed.success) return validationError(parsed.error);
  return runTeamAction('team.invite_revoke', async ({ scope }) => {
    await revokeInvitation({
      restaurantId: scope.restaurantId,
      invitationId: parsed.data,
      actorId: scope.claims.sub,
    });
    return undefined;
  });
}
