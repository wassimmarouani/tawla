import 'server-only';
import { getMessages } from 'next-intl/server';
import type { Messages } from '@/messages';

/**
 * Subset of messages sent to client components: only the namespaces a surface needs, so the
 * other surfaces' strings never ship in its payload.
 */
export async function clientMessages<K extends keyof Messages>(
  namespaces: readonly K[],
): Promise<Pick<Messages, K>> {
  const messages = await getMessages();
  const subset = {} as Pick<Messages, K>;
  for (const namespace of namespaces) subset[namespace] = messages[namespace];
  return subset;
}
