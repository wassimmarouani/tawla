/**
 * Customer service bar (spec 02 "Service requests", ADR-0008, ADR-0011): a pure state machine
 * shared by the bar component and its tests. Times are epoch milliseconds passed in by the
 * caller, never read here.
 */

export type RequestKind = 'waiter' | 'bill';
export type PaymentMethod = 'cash' | 'card';
export type RequestStatus = 'open' | 'claimed' | 'done' | 'cancelled';
export type TableSessionStatus = 'open' | 'bill_requested' | 'closed';

/** Latest request of one kind at the table, as returned by `GET /api/public/session`. */
export interface RequestSnapshot {
  id: string;
  status: RequestStatus;
  version: number;
  paymentMethod: PaymentMethod | null;
  /** Seconds before the table may send this kind again (ADR-0011 §7). */
  retryAfterSeconds: number;
}

/** The phone's view of its table session (`GET /api/public/session`). */
export interface SessionState {
  tableSessionPublicId: string;
  status: TableSessionStatus;
  requests: Record<RequestKind, RequestSnapshot | null>;
  /** The table may still leave feedback (a few per table session). */
  feedbackOpen: boolean;
  /** The venue's Google review link, offered after a 4–5 star rating. */
  reviewUrl: string | null;
}

/**
 * - `idle`: nothing pending.
 * - `sending`: POST in flight.
 * - `waiting`: staff alerted, nobody has claimed it yet.
 * - `claimed`: a waiter is on the way.
 */
export type Phase = 'idle' | 'sending' | 'waiting' | 'claimed';

export interface KindState {
  phase: Phase;
  requestId: string | null;
  version: number;
  paymentMethod: PaymentMethod | null;
  /** Until when this kind is on cooldown (epoch ms); 0 when free. */
  cooldownUntil: number;
}

export type BarNotice = 'offline' | 'failed' | 'cooldown' | 'challenge' | 'blocked' | null;

export interface BarState {
  waiter: KindState;
  bill: KindState;
  /** The payment choice is open (the bill needs cash or card first). */
  choosingPayment: boolean;
  notice: BarNotice;
  /** Kind the notice is about (for "already called, retry in…" messages). */
  noticeKind: RequestKind | null;
  tableSessionPublicId: string | null;
  /** The bill request has been handled: offer feedback (spec 02 "After service"). */
  feedback: 'none' | 'offered' | 'done';
  feedbackOpen: boolean;
  reviewUrl: string | null;
}

const idleKind: KindState = {
  phase: 'idle',
  requestId: null,
  version: 0,
  paymentMethod: null,
  cooldownUntil: 0,
};

export const initialBarState: BarState = {
  waiter: idleKind,
  bill: idleKind,
  choosingPayment: false,
  notice: null,
  noticeKind: null,
  tableSessionPublicId: null,
  feedback: 'none',
  feedbackOpen: true,
  reviewUrl: null,
};

export type BarAction =
  | { type: 'hydrated'; state: SessionState; now: number }
  | { type: 'paymentChoice'; open: boolean }
  | { type: 'sendStarted'; kind: RequestKind }
  | {
      type: 'sendSucceeded';
      kind: RequestKind;
      requestId: string;
      tableSessionPublicId: string;
      paymentMethod: PaymentMethod | null;
      cooldownSeconds: number;
      now: number;
    }
  | {
      type: 'sendFailed';
      kind: RequestKind;
      notice: Exclude<BarNotice, null>;
      retryAfterSeconds?: number | undefined;
      now: number;
    }
  | { type: 'requestHandled'; id: string; status: RequestStatus; version: number }
  | { type: 'sessionClosed' }
  | { type: 'connectivity'; online: boolean }
  | { type: 'feedbackFinished' };

const handled = (status: RequestStatus) => status === 'claimed' || status === 'done';

function phaseOf(status: RequestStatus): Phase {
  if (status === 'open') return 'waiting';
  if (status === 'claimed') return 'claimed';
  return 'idle';
}

function fromSnapshot(snapshot: RequestSnapshot | null, now: number): KindState {
  if (!snapshot) return idleKind;
  return {
    phase: phaseOf(snapshot.status),
    requestId: snapshot.id,
    version: snapshot.version,
    paymentMethod: snapshot.paymentMethod,
    cooldownUntil: snapshot.retryAfterSeconds > 0 ? now + snapshot.retryAfterSeconds * 1000 : 0,
  };
}

function offerFeedback(state: BarState, bill: KindState, billStatus: RequestStatus | null) {
  if (state.feedback !== 'none' || !state.feedbackOpen) return state.feedback;
  return bill.requestId && billStatus && handled(billStatus) ? 'offered' : 'none';
}

export function barReducer(state: BarState, action: BarAction): BarState {
  switch (action.type) {
    case 'hydrated': {
      const { requests } = action.state;
      const closed = action.state.status === 'closed';
      const waiter = closed ? idleKind : fromSnapshot(requests.waiter, action.now);
      const bill = closed
        ? { ...idleKind, requestId: requests.bill?.id ?? null }
        : fromSnapshot(requests.bill, action.now);
      const next: BarState = {
        ...state,
        // A request in flight keeps its spinner; the refetch may predate it.
        waiter: state.waiter.phase === 'sending' ? state.waiter : waiter,
        bill: state.bill.phase === 'sending' ? state.bill : bill,
        tableSessionPublicId: action.state.tableSessionPublicId,
        feedbackOpen: action.state.feedbackOpen,
        reviewUrl: action.state.reviewUrl,
      };
      const billStatus = closed ? 'done' : (requests.bill?.status ?? null);
      return { ...next, feedback: offerFeedback(next, bill, billStatus) };
    }
    case 'paymentChoice':
      return { ...state, choosingPayment: action.open, notice: null, noticeKind: null };
    case 'sendStarted':
      return {
        ...state,
        [action.kind]: { ...state[action.kind], phase: 'sending' },
        choosingPayment: false,
        notice: null,
        noticeKind: null,
      };
    case 'sendSucceeded': {
      const current = state[action.kind];
      // An event may already have moved this request on (claimed before the POST returned).
      const phase =
        current.requestId === action.requestId && current.phase !== 'sending'
          ? current.phase
          : 'waiting';
      return {
        ...state,
        [action.kind]: {
          phase,
          requestId: action.requestId,
          version: current.requestId === action.requestId ? current.version : 1,
          paymentMethod: action.paymentMethod,
          cooldownUntil: action.now + action.cooldownSeconds * 1000,
        },
        tableSessionPublicId: action.tableSessionPublicId,
      };
    }
    case 'sendFailed': {
      const current = state[action.kind];
      const seconds = action.retryAfterSeconds ?? 0;
      return {
        ...state,
        [action.kind]: {
          ...current,
          phase: current.requestId && current.phase === 'sending' ? 'waiting' : 'idle',
          cooldownUntil: seconds > 0 ? action.now + seconds * 1000 : current.cooldownUntil,
        },
        notice: action.notice,
        noticeKind: action.kind,
      };
    }
    case 'requestHandled': {
      const kind = (['waiter', 'bill'] as const).find(
        (candidate) => state[candidate].requestId === action.id,
      );
      if (!kind) return state;
      const current = state[kind];
      if (action.version <= current.version) return state;
      const updated: KindState = {
        ...current,
        phase: current.phase === 'sending' ? 'sending' : phaseOf(action.status),
        version: action.version,
      };
      const next = { ...state, [kind]: updated };
      return kind === 'bill'
        ? { ...next, feedback: offerFeedback(next, updated, action.status) }
        : next;
    }
    case 'sessionClosed':
      return {
        ...state,
        waiter: idleKind,
        bill: { ...idleKind, requestId: state.bill.requestId },
        choosingPayment: false,
        feedback: offerFeedback(state, state.bill, state.bill.requestId ? 'done' : null),
      };
    case 'connectivity':
      if (!action.online) return { ...state, notice: 'offline', noticeKind: null };
      return state.notice === 'offline' ? { ...state, notice: null } : state;
    case 'feedbackFinished':
      return { ...state, feedback: 'done' };
  }
}

/** Whole seconds left on a kind's cooldown at `now` (0 when it may be sent). */
export function secondsLeft(kind: KindState, now: number): number {
  return kind.cooldownUntil > now ? Math.ceil((kind.cooldownUntil - now) / 1000) : 0;
}

/** The bar follows the table's topic while something is pending or feedback may come. */
export function needsLiveUpdates(state: BarState): boolean {
  const pending = (kind: KindState) => kind.phase === 'waiting' || kind.phase === 'claimed';
  return pending(state.waiter) || pending(state.bill);
}

/** `m:ss` countdown, digits only (locale-neutral, like a timer). */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60))}:${String(safe % 60).padStart(2, '0')}`;
}
