/** Pure delivery loop of Web Push (ADR-0022 §3), separated from VAPID and the database. */

export interface PushTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Same tag replaces the previous notification on the device. */
  tag?: string;
  /** Staff path opened on click. */
  url?: string;
}

export type PushSend = (target: PushTarget, payload: string) => Promise<void>;

export interface PushReport {
  sent: string[];
  pruned: string[];
  failed: string[];
}

function statusOf(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return null;
  const code = error.statusCode;
  return typeof code === 'number' ? code : null;
}

/**
 * Sends `message` to every target in parallel. Dead subscriptions (404 Not Found, 410 Gone) are
 * handed to `prune`; other failures are reported and kept for the next attempt.
 */
export async function deliverPush(
  targets: readonly PushTarget[],
  message: PushMessage,
  deps: { send: PushSend; prune: (ids: string[]) => Promise<void> },
): Promise<PushReport> {
  const payload = JSON.stringify(message);
  const report: PushReport = { sent: [], pruned: [], failed: [] };
  await Promise.all(
    targets.map(async (target) => {
      try {
        await deps.send(target, payload);
        report.sent.push(target.id);
      } catch (error) {
        const status = statusOf(error);
        if (status === 404 || status === 410) report.pruned.push(target.id);
        else report.failed.push(target.id);
      }
    }),
  );
  if (report.pruned.length > 0) await deps.prune(report.pruned);
  return report;
}
