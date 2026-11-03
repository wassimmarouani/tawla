/**
 * Staff live screen rules (spec 03, ADR-0007, ADR-0008): which requests a device shows, how
 * realtime events merge into the list, the connection indicator and the escalation decision.
 * Pure: times are epoch milliseconds passed in by callers.
 */

export type LiveRequestStatus = 'open' | 'claimed' | 'done' | 'cancelled';

export interface LiveRequest {
  id: string;
  kind: 'waiter' | 'bill';
  status: LiveRequestStatus;
  tableNumber: number;
  tableLabel: string | null;
  paymentMethod: 'cash' | 'card' | null;
  createdAt: string;
  claimedBy: string | null;
  claimedByName: string | null;
  version: number;
}

/** Open requests, plus those this person claimed (they still have to finish them); oldest first. */
export function visibleRequests(requests: readonly LiveRequest[], userId: string): LiveRequest[] {
  return requests
    .filter(
      (request) =>
        request.status === 'open' || (request.status === 'claimed' && request.claimedBy === userId),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export interface RequestEvent {
  id: string;
  status: LiveRequestStatus;
  version: number;
  claimedBy?: string | null;
}

/**
 * Applies a realtime status change. Stale versions are ignored (ADR-0008 §6); an unknown id
 * returns `null`, telling the caller to refetch (the event carries no table details).
 */
export function applyRequestEvent(
  requests: readonly LiveRequest[],
  event: RequestEvent,
): LiveRequest[] | null {
  const index = requests.findIndex((request) => request.id === event.id);
  if (index === -1) return null;
  const current = requests[index];
  if (!current || event.version <= current.version) return [...requests];
  const next = [...requests];
  next[index] = {
    ...current,
    status: event.status,
    version: event.version,
    ...(event.claimedBy === undefined ? {} : { claimedBy: event.claimedBy }),
  };
  return next;
}

export type ConnectionLevel = 'online' | 'reconnecting' | 'offline';

/**
 * Indicator (spec 03): online when the channel is joined; reconnecting for the first 10 s of an
 * outage; offline after that or when the browser is offline (the screen then polls).
 */
export function connectionLevel(input: {
  browserOnline: boolean;
  subscribed: boolean;
  downSince: number | null;
  now: number;
}): ConnectionLevel {
  if (!input.browserOnline) return 'offline';
  if (input.subscribed) return 'online';
  if (input.downSince === null || input.now - input.downSince < 10_000) return 'reconnecting';
  return 'offline';
}

export const UNCLAIMED_ESCALATION_SECONDS = 120;
export const NO_ACK_ESCALATION_SECONDS = 15;

export interface EscalationInput {
  id: string;
  status: LiveRequestStatus;
  createdAt: Date;
  receipts: number;
}

/**
 * ADR-0007 §4: a request still open after 2 minutes is "unclaimed"; one no device acknowledged
 * within 15 seconds is "no_ack". Incidents are unique per (event, kind), so re-running is safe.
 */
export function escalationCandidates(
  requests: readonly EscalationInput[],
  now: Date,
  thresholds = {
    unclaimedSeconds: UNCLAIMED_ESCALATION_SECONDS,
    noAckSeconds: NO_ACK_ESCALATION_SECONDS,
  },
): { unclaimed: string[]; noAck: string[] } {
  const age = (request: EscalationInput) => (now.getTime() - request.createdAt.getTime()) / 1000;
  const open = requests.filter((request) => request.status === 'open');
  return {
    unclaimed: open
      .filter((request) => age(request) >= thresholds.unclaimedSeconds)
      .map((request) => request.id),
    noAck: open
      .filter((request) => request.receipts === 0 && age(request) >= thresholds.noAckSeconds)
      .map((request) => request.id),
  };
}

/** Whole minutes since `createdAt` (the card shows "2 min"). */
export function minutesSince(createdAt: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
}
