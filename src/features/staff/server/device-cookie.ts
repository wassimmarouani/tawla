import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * Paired-device cookie (ADR-0010 §3): 256-bit token, HttpOnly, SameSite=Strict, `__Host-`
 * prefixed (Secure, host-only) whenever the app runs over HTTPS. Only its SHA-256 is stored.
 */
const secure = env.NEXT_PUBLIC_APP_URL.startsWith('https://');
export const STAFF_DEVICE_COOKIE = secure ? '__Host-tawla_staff_device' : 'tawla_staff_device';
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export async function readDeviceToken(): Promise<string | undefined> {
  return (await cookies()).get(STAFF_DEVICE_COOKIE)?.value;
}

export async function writeDeviceToken(token: string): Promise<void> {
  (await cookies()).set(STAFF_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearDeviceToken(): Promise<void> {
  (await cookies()).delete(STAFF_DEVICE_COOKIE);
}
