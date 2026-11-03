import 'server-only';
import { can, type Action } from '@/features/auth';
import { getTenantContext, type ActiveTenantRestaurant } from '@/features/tenancy';
import type { SessionClaims } from '@/lib/auth/claims';
import { getSessionClaims } from '@/lib/auth/session';
import { AppError, actionError, actionOk, type ActionResult } from '@/lib/errors';
import type { FeatureKey } from '@/lib/flags';
import { log } from '@/lib/log';

/** What a back-office write runs with: verified claims scoped to the active restaurant. */
export interface BackofficeScope {
  claims: SessionClaims;
  restaurantId: string;
}

export interface BackofficeAccess {
  scope: BackofficeScope;
  restaurant: ActiveTenantRestaurant;
  flags: Record<FeatureKey, boolean>;
}

/**
 * Server side of the permission check (CLAUDE.md rule 10): signed in, the active restaurant,
 * `action` allowed for the role, and a restaurant that is not read-only. RLS checks again.
 */
async function backofficeAccess(action: Action): Promise<BackofficeAccess> {
  const claims = await getSessionClaims();
  if (!claims) throw new AppError('UNAUTHENTICATED', 'Not signed in');
  const tenant = await getTenantContext();
  if (tenant.kind !== 'ok') throw new AppError('FORBIDDEN', 'No active restaurant');
  const { role, restaurant, flags } = tenant.context;
  if (!can(role, action)) throw new AppError('FORBIDDEN', `${action} denied`);
  if (restaurant.status !== 'active') {
    throw new AppError('FORBIDDEN', 'Restaurant is read-only', { reason: 'readOnly' });
  }
  return { scope: { claims, restaurantId: restaurant.id }, restaurant, flags };
}

/** Access check, then `run`; AppErrors become ActionResults, anything else is logged. */
export async function withBackofficeAccess<T>(
  action: Action,
  operation: string,
  run: (access: BackofficeAccess) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return actionOk(await run(await backofficeAccess(action)));
  } catch (error) {
    if (error instanceof AppError) {
      const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
      return actionError(error.code, error.message, reason);
    }
    log.error('backoffice.action_failed', { operation, cause: String(error) });
    return actionError('INTERNAL', 'Back-office request failed', 'unexpected');
  }
}
