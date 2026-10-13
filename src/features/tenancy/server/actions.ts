'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { can } from '@/features/auth';
import { env } from '@/lib/env';
import { getSessionClaims } from '@/lib/auth/session';
import { ACTIVE_RESTAURANT_COOKIE } from './context';

const restaurantIdSchema = z.uuid();

/** Restaurant switcher: remembers the choice when the user may open that back-office. */
export async function switchRestaurant(restaurantId: string): Promise<void> {
  const claims = await getSessionClaims();
  if (!claims) redirect('/login');
  const parsed = restaurantIdSchema.safeParse(restaurantId);
  const membership = parsed.success
    ? claims.memberships.find((candidate) => candidate.restaurant_id === parsed.data)
    : undefined;
  if (membership && can(membership.role, 'dashboard.view')) {
    (await cookies()).set(ACTIVE_RESTAURANT_COOKIE, membership.restaurant_id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NEXT_PUBLIC_APP_URL.startsWith('https://'),
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect('/dashboard');
}

/** Leaves a forbidden restaurant (403 page) and returns to the default one. */
export async function clearRestaurantSelection(): Promise<void> {
  (await cookies()).delete(ACTIVE_RESTAURANT_COOKIE);
  redirect('/dashboard');
}
