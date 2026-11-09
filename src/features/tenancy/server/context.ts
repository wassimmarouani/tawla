import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { requireSessionClaims } from '@/lib/auth/session';
import { loadTenantContext, type TenantContextResult } from '../queries/tenant-context';

/** Restaurant chosen in the switcher. Only a hint: membership is re-checked on every request. */
export const ACTIVE_RESTAURANT_COOKIE = 'taply_restaurant';

/**
 * Tenant context of the current back-office request, loaded once per request (spec 07).
 * Redirects to the login page when signed out.
 */
export const getTenantContext = cache(async (): Promise<TenantContextResult> => {
  const claims = await requireSessionClaims('/dashboard');
  const requested = (await cookies()).get(ACTIVE_RESTAURANT_COOKIE)?.value ?? null;
  return loadTenantContext(claims, requested, new Date());
});
