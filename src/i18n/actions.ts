'use server';

import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { LOCALE_COOKIE, isLocale } from './locales';

/** Remembers the visitor's language for unprefixed app routes (ADR-0012). */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    secure: env.NEXT_PUBLIC_APP_URL.startsWith('https://'),
    maxAge: 60 * 60 * 24 * 365,
  });
}
