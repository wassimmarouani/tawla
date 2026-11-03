import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { SessionClaims } from '@/lib/auth/claims';
import { getSessionClaims } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import {
  activeStaffSession,
  deviceForToken,
  type ActiveStaffSession,
  type PairedDevice,
} from '@/server/admin/staff-access';
import { readDeviceToken } from './device-cookie';

export interface StaffContext {
  device: PairedDevice;
  claims: SessionClaims;
  session: ActiveStaffSession;
}

/** The paired device of this browser, or `null` (never paired, revoked). Cached per request. */
export const currentDevice = cache(async (): Promise<PairedDevice | null> =>
  deviceForToken(await readDeviceToken()),
);

/**
 * Every staff request (ADR-0010): a live paired device, a signed-in user and a live staff
 * session on that device. Throws DEVICE_NOT_PAIRED / UNAUTHENTICATED for Route Handlers.
 */
export async function staffContext(): Promise<StaffContext> {
  const device = await currentDevice();
  if (!device) throw new AppError('DEVICE_NOT_PAIRED', 'No paired device');
  const claims = await getSessionClaims();
  if (!claims) throw new AppError('UNAUTHENTICATED', 'Not signed in');
  const session = await activeStaffSession({ deviceId: device.id, userId: claims.sub });
  if (!session) throw new AppError('UNAUTHENTICATED', 'No staff session on this device');
  return { device, claims, session };
}

/** Pages: same checks, redirecting to pairing or login instead of throwing. */
export async function requireStaffPage(): Promise<StaffContext> {
  try {
    return await staffContext();
  } catch (error) {
    if (error instanceof AppError && error.code === 'DEVICE_NOT_PAIRED') redirect('/staff/pair');
    if (error instanceof AppError && error.code === 'UNAUTHENTICATED') redirect('/staff/login');
    throw error;
  }
}

export { activeStaffSession };
