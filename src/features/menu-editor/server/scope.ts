import 'server-only';
import { refresh, updateTag } from 'next/cache';
import { withBackofficeAccess, type BackofficeAccess } from '@/features/backoffice';
import { menuCacheTags } from '@/features/menu';
import type { ActionResult } from '@/lib/errors';
import type { EditorScope } from './mutations';

/** Access check for `menu.edit` (shared back-office rules), then `run`. */
export async function withEditorAccess<T>(
  operation: string,
  run: (access: BackofficeAccess) => Promise<T>,
): Promise<ActionResult<T>> {
  return withBackofficeAccess('menu.edit', operation, run);
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
