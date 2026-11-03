import 'server-only';
import { refresh, updateTag } from 'next/cache';
import { can } from '@/features/auth';
import { menuCacheTags } from '@/features/menu';
import { getTenantContext, type ActiveTenantRestaurant } from '@/features/tenancy';
import { getSessionClaims } from '@/lib/auth/session';
import { AppError, actionError, actionOk, type ActionResult } from '@/lib/errors';
import { log } from '@/lib/log';
import type { EditorScope } from './mutations';

interface EditorAccess {
  scope: EditorScope;
  restaurant: ActiveTenantRestaurant;
}

/**
 * Server side of the permission check (CLAUDE.md rule 10): signed in, the active restaurant,
 * `menu.edit` for the role, and a restaurant that is not read-only. RLS checks again.
 */
async function editorAccess(): Promise<EditorAccess> {
  const claims = await getSessionClaims();
  if (!claims) throw new AppError('UNAUTHENTICATED', 'Not signed in');
  const tenant = await getTenantContext();
  if (tenant.kind !== 'ok') throw new AppError('FORBIDDEN', 'No active restaurant');
  const { role, restaurant } = tenant.context;
  if (!can(role, 'menu.edit')) throw new AppError('FORBIDDEN', 'menu.edit denied');
  if (restaurant.status !== 'active') {
    throw new AppError('FORBIDDEN', 'Restaurant is read-only', { reason: 'readOnly' });
  }
  return { scope: { claims, restaurantId: restaurant.id }, restaurant };
}

/** Access check, then `run`; AppErrors become ActionResults, anything else is logged. */
export async function withEditorAccess<T>(
  operation: string,
  run: (access: EditorAccess) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return actionOk(await run(await editorAccess()));
  } catch (error) {
    if (error instanceof AppError) {
      const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
      return actionError(error.code, error.message, reason);
    }
    log.error('menu_editor.failed', { operation, cause: String(error) });
    return actionError('INTERNAL', 'Menu editor request failed', 'unexpected');
  }
}

/**
 * An editor write, then cache invalidation of the public menu (ADR-0017) so customers see the
 * change on their next request, and a refresh of the editor in the same round trip.
 */
export async function runEditorAction<T>(
  operation: string,
  write: (scope: EditorScope) => Promise<T>,
): Promise<ActionResult<T>> {
  return withEditorAccess(operation, async ({ scope, restaurant }) => {
    const data = await write(scope);
    for (const tag of menuCacheTags(restaurant.slug, restaurant.publicId)) updateTag(tag);
    refresh();
    return data;
  });
}
