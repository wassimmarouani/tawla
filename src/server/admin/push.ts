import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import webpush from 'web-push';
import { z } from 'zod';
import { rawDb } from '@/lib/db/client';
import { pushSubscriptions } from '@/lib/db/schema/schema';
import { env } from '@/lib/env';
import { log } from '@/lib/log';
import { adminEnv } from './env';
import { deliverPush, type PushMessage, type PushReport, type PushSend } from './push-delivery';

export type { PushMessage, PushReport } from './push-delivery';

/**
 * Web Push to staff devices (ADR-0022 §3) with VAPID. Subscriptions the push service reports as
 * gone (404/410) are deleted. Without VAPID keys (local runs) sending is a logged no-op.
 */

const vapidSchema = z.object({
  publicKey: z.string().min(40),
  privateKey: z.string().min(20),
  subject: z.string().regex(/^(mailto:|https:\/\/)/),
});

/** VAPID details from env, or `null` when push is not configured. */
function vapid(): z.infer<typeof vapidSchema> | null {
  const parsed = vapidSchema.safeParse({
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: adminEnv().VAPID_PRIVATE_KEY,
    subject: adminEnv().VAPID_SUBJECT,
  });
  return parsed.success ? parsed.data : null;
}

const webPushSend =
  (keys: z.infer<typeof vapidSchema>): PushSend =>
  async (target, payload) => {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      payload,
      {
        vapidDetails: keys,
        TTL: 120,
        urgency: 'high',
        timeout: 5000,
      },
    );
  };

/** Pushes to the given members of a restaurant (all members with `null`). */
export async function pushToMembers(
  restaurantId: string,
  membershipIds: readonly string[] | null,
  message: PushMessage,
): Promise<PushReport> {
  const keys = vapid();
  const empty: PushReport = { sent: [], pruned: [], failed: [] };
  if (!keys) {
    log.info('push.skipped', { reason: 'vapid_not_configured' });
    return empty;
  }
  const db = rawDb();
  const targets = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256Dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.restaurantId, restaurantId),
        membershipIds ? inArray(pushSubscriptions.membershipId, [...membershipIds]) : undefined,
      ),
    );
  if (targets.length === 0) return empty;
  const report = await deliverPush(targets, message, {
    send: webPushSend(keys),
    prune: async (ids) => {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids));
    },
  });
  if (report.sent.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ lastSuccessAt: sql`now()` })
      .where(inArray(pushSubscriptions.id, report.sent));
  }
  if (report.failed.length > 0) log.warn('push.failed', { count: report.failed.length });
  return report;
}

/** Stores (or moves) a browser subscription for a member on a paired device. */
export async function saveSubscription(input: {
  restaurantId: string;
  membershipId: string;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await rawDb()
    .insert(pushSubscriptions)
    .values({
      restaurantId: input.restaurantId,
      membershipId: input.membershipId,
      deviceId: input.deviceId,
      endpoint: input.endpoint,
      p256Dh: input.p256dh,
      auth: input.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        restaurantId: input.restaurantId,
        membershipId: input.membershipId,
        deviceId: input.deviceId,
        p256Dh: input.p256dh,
        auth: input.auth,
      },
    });
}

export async function deleteSubscription(input: {
  restaurantId: string;
  membershipId: string;
  endpoint: string;
}): Promise<void> {
  await rawDb()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.restaurantId, input.restaurantId),
        eq(pushSubscriptions.membershipId, input.membershipId),
        eq(pushSubscriptions.endpoint, input.endpoint),
      ),
    );
}
