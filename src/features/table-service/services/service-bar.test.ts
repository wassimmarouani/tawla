import { describe, expect, it } from 'vitest';
import {
  barReducer,
  formatCountdown,
  initialBarState,
  needsLiveUpdates,
  secondsLeft,
  type BarState,
  type RequestSnapshot,
  type SessionState,
} from './service-bar';

const NOW = 1_000_000;

const snapshot = (overrides: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  id: 'req-1',
  status: 'open',
  version: 1,
  paymentMethod: null,
  retryAfterSeconds: 40,
  ...overrides,
});

const session = (overrides: Partial<SessionState> = {}): SessionState => ({
  tableSessionPublicId: 'pub-1',
  status: 'open',
  requests: { waiter: null, bill: null },
  feedbackOpen: true,
  reviewUrl: null,
  ...overrides,
});

const sent = (state: BarState, kind: 'waiter' | 'bill', id: string) =>
  barReducer(barReducer(state, { type: 'sendStarted', kind }), {
    type: 'sendSucceeded',
    kind,
    requestId: id,
    tableSessionPublicId: 'pub-1',
    paymentMethod: kind === 'bill' ? 'card' : null,
    cooldownSeconds: 60,
    now: NOW,
  });

describe('service bar state', () => {
  it('sends a waiter call: spinner, then waiting with a 60 s cooldown', () => {
    const sending = barReducer(
      { ...initialBarState, notice: 'failed', noticeKind: 'waiter' },
      { type: 'sendStarted', kind: 'waiter' },
    );
    expect(sending.waiter.phase).toBe('sending');
    expect(sending.notice).toBeNull();
    const done = sent(initialBarState, 'waiter', 'req-1');
    expect(done.waiter).toEqual({
      phase: 'waiting',
      requestId: 'req-1',
      version: 1,
      paymentMethod: null,
      cooldownUntil: NOW + 60_000,
    });
    expect(done.tableSessionPublicId).toBe('pub-1');
    expect(secondsLeft(done.waiter, NOW + 1500)).toBe(59);
    expect(secondsLeft(done.waiter, NOW + 60_000)).toBe(0);
    expect(needsLiveUpdates(done)).toBe(true);
    expect(needsLiveUpdates(initialBarState)).toBe(false);
  });

  it('keeps a claim that arrived before the POST answered', () => {
    let state = barReducer(initialBarState, {
      type: 'hydrated',
      state: session({
        requests: { waiter: snapshot({ status: 'claimed', version: 2 }), bill: null },
      }),
      now: NOW,
    });
    state = barReducer(state, { type: 'sendStarted', kind: 'waiter' });
    // The replayed key answers with the same request: its claimed phase stays… once known.
    state = { ...state, waiter: { ...state.waiter, phase: 'claimed' } };
    state = barReducer(state, {
      type: 'sendSucceeded',
      kind: 'waiter',
      requestId: 'req-1',
      tableSessionPublicId: 'pub-1',
      paymentMethod: null,
      cooldownSeconds: 60,
      now: NOW,
    });
    expect(state.waiter.phase).toBe('claimed');
    expect(state.waiter.version).toBe(2);
  });

  it('opens and closes the payment choice', () => {
    const open = barReducer(
      { ...initialBarState, notice: 'cooldown', noticeKind: 'bill' },
      { type: 'paymentChoice', open: true },
    );
    expect(open.choosingPayment).toBe(true);
    expect(open.notice).toBeNull();
    expect(barReducer(open, { type: 'paymentChoice', open: false }).choosingPayment).toBe(false);
    expect(barReducer(open, { type: 'sendStarted', kind: 'bill' }).choosingPayment).toBe(false);
  });

  it('maps failures to notices and cooldowns', () => {
    const throttled = barReducer(
      barReducer(initialBarState, { type: 'sendStarted', kind: 'waiter' }),
      {
        type: 'sendFailed',
        kind: 'waiter',
        notice: 'cooldown',
        retryAfterSeconds: 30,
        now: NOW,
      },
    );
    expect(throttled.waiter.phase).toBe('idle');
    expect(throttled.waiter.cooldownUntil).toBe(NOW + 30_000);
    expect(throttled.notice).toBe('cooldown');
    expect(throttled.noticeKind).toBe('waiter');

    // A pending request that fails to be re-sent keeps waiting, and its cooldown.
    const pending = sent(initialBarState, 'waiter', 'req-1');
    const retried = barReducer(barReducer(pending, { type: 'sendStarted', kind: 'waiter' }), {
      type: 'sendFailed',
      kind: 'waiter',
      notice: 'failed',
      now: NOW,
    });
    expect(retried.waiter.phase).toBe('waiting');
    expect(retried.waiter.cooldownUntil).toBe(NOW + 60_000);
  });

  it('follows request events and ignores stale or unknown ones', () => {
    const state = sent(initialBarState, 'waiter', 'req-1');
    const claimed = barReducer(state, {
      type: 'requestHandled',
      id: 'req-1',
      status: 'claimed',
      version: 2,
    });
    expect(claimed.waiter.phase).toBe('claimed');
    expect(
      barReducer(claimed, { type: 'requestHandled', id: 'req-1', status: 'open', version: 2 }),
    ).toBe(claimed);
    expect(
      barReducer(claimed, { type: 'requestHandled', id: 'other', status: 'done', version: 9 }),
    ).toBe(claimed);
    const done = barReducer(claimed, {
      type: 'requestHandled',
      id: 'req-1',
      status: 'done',
      version: 3,
    });
    expect(done.waiter.phase).toBe('idle');
    expect(done.feedback).toBe('none');
    expect(needsLiveUpdates(done)).toBe(false);

    // An event during a re-send keeps the spinner.
    const resending = barReducer(state, { type: 'sendStarted', kind: 'waiter' });
    expect(
      barReducer(resending, { type: 'requestHandled', id: 'req-1', status: 'claimed', version: 2 })
        .waiter.phase,
    ).toBe('sending');
  });

  it('offers feedback once the bill request is handled, unless the table is done rating', () => {
    const billed = sent(initialBarState, 'bill', 'bill-1');
    expect(billed.bill.paymentMethod).toBe('card');
    const handled = barReducer(billed, {
      type: 'requestHandled',
      id: 'bill-1',
      status: 'claimed',
      version: 2,
    });
    expect(handled.bill.phase).toBe('claimed');
    expect(handled.feedback).toBe('offered');
    expect(barReducer(handled, { type: 'feedbackFinished' }).feedback).toBe('done');

    const full = { ...billed, feedbackOpen: false };
    expect(
      barReducer(full, { type: 'requestHandled', id: 'bill-1', status: 'done', version: 2 })
        .feedback,
    ).toBe('none');
  });

  it('hydrates from the server: phases, cooldowns, review link and feedback', () => {
    const state = barReducer(initialBarState, {
      type: 'hydrated',
      state: session({
        status: 'bill_requested',
        requests: {
          waiter: snapshot({ retryAfterSeconds: 0, status: 'done', version: 3 }),
          bill: snapshot({
            id: 'bill-1',
            status: 'claimed',
            paymentMethod: 'cash',
            retryAfterSeconds: 12,
          }),
        },
        reviewUrl: 'https://g.page/r/x/review',
      }),
      now: NOW,
    });
    expect(state.waiter).toMatchObject({ phase: 'idle', requestId: 'req-1', cooldownUntil: 0 });
    expect(state.bill).toMatchObject({
      phase: 'claimed',
      paymentMethod: 'cash',
      cooldownUntil: NOW + 12_000,
    });
    expect(state.feedback).toBe('offered');
    expect(state.reviewUrl).toBe('https://g.page/r/x/review');

    // A refetch never cancels a spinner.
    const sending = barReducer(initialBarState, { type: 'sendStarted', kind: 'bill' });
    const merged = barReducer(sending, { type: 'hydrated', state: session(), now: NOW });
    expect(merged.bill.phase).toBe('sending');
    expect(merged.feedback).toBe('none');
  });

  it('resets on a closed session and offers feedback when a bill was asked', () => {
    const closedWithBill = barReducer(initialBarState, {
      type: 'hydrated',
      state: session({
        status: 'closed',
        requests: { waiter: snapshot(), bill: snapshot({ id: 'bill-1' }) },
      }),
      now: NOW,
    });
    expect(closedWithBill.waiter.phase).toBe('idle');
    expect(closedWithBill.bill).toMatchObject({ phase: 'idle', requestId: 'bill-1' });
    expect(closedWithBill.feedback).toBe('offered');

    const closedWithout = barReducer(initialBarState, {
      type: 'hydrated',
      state: session({ status: 'closed' }),
      now: NOW,
    });
    expect(closedWithout.feedback).toBe('none');

    const live = sent(sent(initialBarState, 'waiter', 'req-1'), 'bill', 'bill-1');
    const closed = barReducer({ ...live, choosingPayment: true }, { type: 'sessionClosed' });
    expect(closed.waiter.phase).toBe('idle');
    expect(closed.bill.phase).toBe('idle');
    expect(closed.choosingPayment).toBe(false);
    expect(closed.feedback).toBe('offered');
    expect(barReducer(initialBarState, { type: 'sessionClosed' }).feedback).toBe('none');
  });

  it('tracks connectivity', () => {
    const offline = barReducer(initialBarState, { type: 'connectivity', online: false });
    expect(offline.notice).toBe('offline');
    expect(barReducer(offline, { type: 'connectivity', online: true }).notice).toBeNull();
    const failed = { ...initialBarState, notice: 'failed' as const };
    expect(barReducer(failed, { type: 'connectivity', online: true })).toBe(failed);
  });

  it('formats countdowns as m:ss', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(59.2)).toBe('1:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
