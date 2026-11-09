'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import type { RealtimeConfig } from '@/lib/realtime/customer-channel';
import { classes } from '@/lib/classes';
import { REQUEST_COOLDOWN_SECONDS } from '../services/cooldown';
import {
  barReducer,
  formatCountdown,
  initialBarState,
  needsLiveUpdates,
  secondsLeft,
  type BarState,
  type KindState,
  type PaymentMethod,
  type RequestKind,
  type RequestStatus,
} from '../services/service-bar';
import type { FeedbackLabels } from './feedback-card';
import { newIdempotencyKey, publicApi, type ApiResult } from './public-api';

const FeedbackCard = lazy(() =>
  import('./feedback-card').then((module) => ({ default: module.FeedbackCard })),
);

export interface ServiceBarLabels {
  region: string;
  callWaiter: string;
  callAgain: string;
  bill: string;
  sending: string;
  waiterWaiting: string;
  waiterClaimed: string;
  billWaiting: string;
  billClaimed: string;
  /** Status lines; `{method}` stands for the payment method. */
  statusWaiterWaiting: string;
  statusWaiterClaimed: string;
  statusBillWaiting: string;
  statusBillClaimed: string;
  /** `{time}` stands for an m:ss countdown. */
  retryIn: string;
  payQuestion: string;
  cash: string;
  card: string;
  cancel: string;
  offline: string;
  failed: string;
  /** `{time}` stands for an m:ss countdown. */
  cooldown: string;
  challenge: string;
  blocked: string;
}

const STATUSES: ReadonlySet<string> = new Set<RequestStatus>([
  'open',
  'claimed',
  'done',
  'cancelled',
]);

/** Per-tab memory that this phone joined the table (the session cookie is HttpOnly). */
const tableKey = (token: string) => `taply:table:${token}`;
const feedbackKey = (publicId: string) => `taply:feedback:${publicId}`;

function remember(key: string, value: boolean) {
  try {
    if (value) sessionStorage.setItem(key, '1');
    else sessionStorage.removeItem(key);
  } catch {
    // Private mode or blocked storage: the bar still works, it just forgets on reload.
  }
}

function remembered(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * "Call waiter" / "Request bill" bar of the table menu (spec 02, ADR-0011): fixed at the bottom,
 * with cooldown countdowns, offline handling, the live "waiter is coming" state over the lazy
 * `s:` channel (ADR-0008) and the feedback prompt once the bill request is handled.
 */
export function ServiceBar({
  token,
  locale,
  realtime,
  turnstileSiteKey,
  labels,
  feedbackLabels,
}: {
  token: string;
  locale: string;
  realtime: RealtimeConfig;
  turnstileSiteKey: string;
  labels: ServiceBarLabels;
  feedbackLabels: FeedbackLabels;
}) {
  const [state, dispatch] = useReducer(barReducer, initialBarState);
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const keys = useRef<Record<RequestKind, string | null>>({ waiter: null, bill: null });
  const challenge = useRef<HTMLDivElement>(null);
  const billButton = useRef<HTMLButtonElement>(null);
  const firstPayment = useRef<HTMLButtonElement>(null);

  const stamp = () => {
    const at = Date.now();
    setNow(at);
    return at;
  };

  async function refetch() {
    const result = await publicApi.sessionState(token);
    if (!result.ok) return;
    const fresh = result.data.state;
    if (!fresh) {
      remember(tableKey(token), false);
      return;
    }
    dispatch({ type: 'hydrated', state: fresh, now: stamp() });
    if (remembered(feedbackKey(fresh.tableSessionPublicId))) {
      dispatch({ type: 'feedbackFinished' });
    }
  }

  const onRefetch = useEffectEvent(() => {
    void refetch();
  });

  // Restores the bar after a reload, and on return to the tab.
  useEffect(() => {
    const sync = () => {
      const shown = document.visibilityState === 'visible';
      setVisible(shown);
      if (shown && remembered(tableKey(token))) onRefetch();
    };
    const connectivity = () => {
      dispatch({ type: 'connectivity', online: navigator.onLine });
    };
    sync();
    if (!navigator.onLine) connectivity();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
    };
  }, [token]);

  const cooling = state.waiter.cooldownUntil > now || state.bill.cooldownUntil > now;
  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [cooling]);

  const onChannelEvent = useEffectEvent((event: string, payload: Record<string, unknown>) => {
    if (event === 'session.closed') {
      dispatch({ type: 'sessionClosed' });
      return;
    }
    const { id, status, version } = payload;
    if (
      event === 'request.handled' &&
      typeof id === 'string' &&
      typeof status === 'string' &&
      STATUSES.has(status) &&
      typeof version === 'number'
    ) {
      dispatch({ type: 'requestHandled', id, status: status as RequestStatus, version });
    }
  });

  // The s: channel stays open while a request is pending and the page is visible (ADR-0008 §5).
  // When it is down for 10 s, the bar polls every 10 s (ADR-0008 §6).
  const publicId = state.tableSessionPublicId;
  const live = needsLiveUpdates(state) && visible && publicId !== null;
  const { url, publishableKey } = realtime;
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let leave: (() => void) | null = null;
    let downSince: number | null = Date.now();
    void import('@/lib/realtime/customer-channel').then(({ openCustomerChannel }) => {
      if (cancelled) return;
      leave = openCustomerChannel({
        config: { url, publishableKey },
        topic: `s:${publicId}`,
        onEvent: onChannelEvent,
        onStatus: (connected) => {
          if (connected) {
            downSince = null;
            onRefetch();
          } else {
            downSince ??= Date.now();
          }
        },
      });
    });
    const poll = setInterval(() => {
      if (downSince !== null && Date.now() - downSince >= 10_000) onRefetch();
    }, 10_000);
    return () => {
      cancelled = true;
      leave?.();
      clearInterval(poll);
    };
  }, [live, publicId, url, publishableKey]);

  useEffect(() => {
    if (state.choosingPayment) firstPayment.current?.focus();
  }, [state.choosingPayment]);

  async function openSession() {
    let opened = await publicApi.openSession(token);
    if (opened.ok) remember(tableKey(token), true);
    const container = challenge.current;
    if (!opened.ok && opened.code === 'CHALLENGE_REQUIRED' && container) {
      try {
        const { solveTurnstile } = await import('./turnstile');
        const proof = await solveTurnstile(turnstileSiteKey, container, locale);
        opened = await publicApi.openSession(token, proof);
        if (opened.ok) remember(tableKey(token), true);
      } catch {
        // Widget failed or was not solved: the CHALLENGE_REQUIRED notice explains what to do.
      }
    }
    return opened;
  }

  function fail(kind: RequestKind, result: Extract<ApiResult<unknown>, { ok: false }>) {
    let notice: 'offline' | 'failed' | 'cooldown' | 'challenge' | 'blocked' = 'failed';
    if (result.code === 'NETWORK') notice = navigator.onLine ? 'failed' : 'offline';
    else if (result.code === 'RATE_LIMITED') notice = 'cooldown';
    else if (result.code === 'CHALLENGE_REQUIRED') notice = 'challenge';
    else if (result.code === 'FORBIDDEN') notice = 'blocked';
    dispatch({
      type: 'sendFailed',
      kind,
      notice,
      retryAfterSeconds: result.retryAfterSeconds,
      now: stamp(),
    });
  }

  async function send(kind: RequestKind, paymentMethod: PaymentMethod | null) {
    if (!navigator.onLine) {
      dispatch({ type: 'connectivity', online: false });
      return;
    }
    dispatch({ type: 'sendStarted', kind });
    // One key per intent: a retry after a network error is replayed, not duplicated.
    const key = keys.current[kind] ?? newIdempotencyKey();
    keys.current[kind] = key;
    const join = async () => {
      const opened = await openSession();
      if (!opened.ok) {
        keys.current[kind] = null;
        fail(kind, opened);
      }
      return opened.ok;
    };
    // First action at this table: join it (POST /sessions) before the request.
    if (!remembered(tableKey(token)) && !(await join())) return;
    let result = await publicApi.serviceRequest(token, kind, paymentMethod, key);
    if (!result.ok && result.code === 'SESSION_EXPIRED') {
      // The session closed (idle, bill paid) or the cookie expired: join again once.
      if (!(await join())) return;
      result = await publicApi.serviceRequest(token, kind, paymentMethod, key);
    }
    if (result.ok) {
      keys.current[kind] = null;
      remember(tableKey(token), true);
      dispatch({
        type: 'sendSucceeded',
        kind,
        requestId: result.data.id,
        tableSessionPublicId: result.data.tableSessionPublicId,
        paymentMethod,
        cooldownSeconds: REQUEST_COOLDOWN_SECONDS,
        now: stamp(),
      });
      return;
    }
    if (result.code !== 'NETWORK') keys.current[kind] = null;
    fail(kind, result);
  }

  const offline = state.notice === 'offline';
  const status = statusLine(state, labels, now);

  return (
    <div
      role="region"
      aria-label={labels.region}
      data-service-bar=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-safe shadow-lg backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5 px-gutter pt-3 pb-3">
        {state.feedback === 'offered' ? (
          <Suspense fallback={null}>
            <FeedbackCard
              labels={feedbackLabels}
              reviewUrl={state.reviewUrl}
              onFinished={() => {
                if (publicId) remember(feedbackKey(publicId), true);
                dispatch({ type: 'feedbackFinished' });
              }}
            />
          </Suspense>
        ) : null}
        <p
          aria-live="polite"
          className={classes(
            'text-center text-sm empty:hidden',
            state.notice ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {status}
        </p>
        <div ref={challenge} className="empty:hidden" />
        {state.choosingPayment ? (
          <div role="group" aria-labelledby="pay-question" className="flex flex-col gap-2">
            <p id="pay-question" className="text-center text-md font-semibold">
              {labels.payQuestion}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'card'] as const).map((method, index) => (
                <BarButton
                  key={method}
                  ref={index === 0 ? firstPayment : undefined}
                  tone="solid"
                  onClick={() => void send('bill', method)}
                >
                  {method === 'cash' ? labels.cash : labels.card}
                </BarButton>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'paymentChoice', open: false });
                requestAnimationFrame(() => billButton.current?.focus());
              }}
              className="mx-auto min-h-11 rounded-full px-4 text-sm font-medium text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {labels.cancel}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <KindButton
              kind={state.waiter}
              now={now}
              offline={offline}
              tone="solid"
              icon={<BellIcon />}
              labels={{
                idle: labels.callWaiter,
                again: labels.callAgain,
                waiting: labels.waiterWaiting,
                claimed: labels.waiterClaimed,
                sending: labels.sending,
                retryIn: labels.retryIn,
              }}
              onClick={() => void send('waiter', null)}
            />
            <KindButton
              ref={billButton}
              kind={state.bill}
              now={now}
              offline={offline}
              tone="subtle"
              icon={<ReceiptIcon />}
              labels={{
                idle: labels.bill,
                again: labels.bill,
                waiting: labels.billWaiting,
                claimed: labels.billClaimed,
                sending: labels.sending,
                retryIn: labels.retryIn,
              }}
              onClick={() => {
                dispatch({ type: 'paymentChoice', open: true });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function statusLine(state: BarState, labels: ServiceBarLabels, now: number): string {
  const method = (kind: KindState) => (kind.paymentMethod === 'card' ? labels.card : labels.cash);
  switch (state.notice) {
    case 'offline':
      return labels.offline;
    case 'failed':
      return labels.failed;
    case 'challenge':
      return labels.challenge;
    case 'blocked':
      return labels.blocked;
    case 'cooldown': {
      const left = state.noticeKind ? secondsLeft(state[state.noticeKind], now) : 0;
      if (left > 0) return labels.cooldown.replace('{time}', formatCountdown(left));
      break;
    }
    case null:
      break;
  }
  if (state.bill.phase === 'claimed') {
    return labels.statusBillClaimed.replace('{method}', method(state.bill));
  }
  if (state.bill.phase === 'waiting') {
    return labels.statusBillWaiting.replace('{method}', method(state.bill));
  }
  if (state.waiter.phase === 'claimed') return labels.statusWaiterClaimed;
  if (state.waiter.phase === 'waiting') return labels.statusWaiterWaiting;
  return '';
}

function KindButton({
  kind,
  now,
  offline,
  tone,
  icon,
  labels,
  onClick,
  ref,
}: {
  kind: KindState;
  now: number;
  offline: boolean;
  tone: 'solid' | 'subtle';
  icon: ReactNode;
  labels: {
    idle: string;
    again: string;
    waiting: string;
    claimed: string;
    sending: string;
    retryIn: string;
  };
  onClick: () => void;
  ref?: Ref<HTMLButtonElement> | undefined;
}) {
  const left = secondsLeft(kind, now);
  const sending = kind.phase === 'sending';
  let label = labels.idle;
  if (sending) label = labels.sending;
  else if (left > 0 && kind.phase === 'waiting') label = labels.waiting;
  else if (kind.phase === 'claimed') label = labels.claimed;
  else if (kind.phase === 'waiting') label = labels.again;
  // A pending request reads as a status, not as a greyed-out button.
  const status = !sending && (left > 0 || kind.phase === 'claimed');
  return (
    <BarButton
      ref={ref}
      tone={status ? 'status' : tone}
      disabled={sending || left > 0 || offline}
      busy={sending}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {status ? null : icon}
        <span>{label}</span>
      </span>
      {left > 0 && !sending ? (
        <span className="text-sm font-medium tabular-nums">
          {labels.retryIn.replace('{time}', formatCountdown(left))}
        </span>
      ) : null}
    </BarButton>
  );
}

function BarButton({
  tone,
  disabled = false,
  busy = false,
  onClick,
  children,
  ref,
}: {
  tone: 'solid' | 'subtle' | 'status';
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement> | undefined;
}) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-busy={busy || undefined}
      onClick={onClick}
      className={classes(
        'flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center text-md leading-tight font-semibold transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed motion-reduce:transition-none',
        tone === 'solid' && 'bg-brand-solid text-brand-on-solid disabled:opacity-60',
        tone === 'subtle' && 'bg-brand-subtle text-brand-on-subtle disabled:opacity-60',
        tone === 'status' && 'border border-border bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}
