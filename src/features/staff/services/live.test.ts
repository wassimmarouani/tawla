import { describe, expect, it } from 'vitest';
import {
  applyRequestEvent,
  connectionLevel,
  escalationCandidates,
  minutesSince,
  visibleRequests,
  type LiveRequest,
} from './live';

const request = (overrides: Partial<LiveRequest>): LiveRequest => ({
  id: 'r1',
  kind: 'waiter',
  status: 'open',
  tableNumber: 4,
  tableLabel: null,
  paymentMethod: null,
  createdAt: '2026-11-03T10:00:00.000Z',
  claimedBy: null,
  claimedByName: null,
  version: 1,
  ...overrides,
});

describe('visibleRequests', () => {
  it('shows open requests and my claims, oldest first', () => {
    const list = visibleRequests(
      [
        request({ id: 'late', createdAt: '2026-11-03T10:05:00.000Z' }),
        request({ id: 'early', createdAt: '2026-11-03T09:55:00.000Z' }),
        request({ id: 'mine', status: 'claimed', claimedBy: 'me' }),
        request({ id: 'theirs', status: 'claimed', claimedBy: 'other' }),
        request({ id: 'done', status: 'done' }),
      ],
      'me',
    );
    expect(list.map((item) => item.id)).toEqual(['early', 'mine', 'late']);
  });
});

describe('applyRequestEvent', () => {
  it('updates newer versions, ignores stale ones and asks for a refetch on unknown ids', () => {
    const list = [request({})];
    expect(
      applyRequestEvent(list, { id: 'r1', status: 'claimed', version: 2, claimedBy: 'u' })?.[0],
    ).toMatchObject({ status: 'claimed', version: 2, claimedBy: 'u' });
    expect(applyRequestEvent(list, { id: 'r1', status: 'done', version: 1 })?.[0]?.status).toBe(
      'open',
    );
    expect(applyRequestEvent(list, { id: 'r1', status: 'done', version: 3 })?.[0]).toMatchObject({
      status: 'done',
      claimedBy: null,
    });
    expect(applyRequestEvent(list, { id: 'nope', status: 'done', version: 9 })).toBeNull();
  });
});

describe('connectionLevel', () => {
  it('is green when joined, orange for 10 s, then red', () => {
    const now = 100_000;
    expect(connectionLevel({ browserOnline: true, subscribed: true, downSince: null, now })).toBe(
      'online',
    );
    expect(connectionLevel({ browserOnline: true, subscribed: false, downSince: null, now })).toBe(
      'reconnecting',
    );
    expect(
      connectionLevel({ browserOnline: true, subscribed: false, downSince: now - 9_000, now }),
    ).toBe('reconnecting');
    expect(
      connectionLevel({ browserOnline: true, subscribed: false, downSince: now - 10_000, now }),
    ).toBe('offline');
    expect(connectionLevel({ browserOnline: false, subscribed: true, downSince: null, now })).toBe(
      'offline',
    );
  });
});

describe('escalationCandidates', () => {
  it('flags open requests unclaimed after 2 min and unacknowledged after 15 s', () => {
    const now = new Date('2026-11-03T10:02:00Z');
    const at = (seconds: number) => new Date(now.getTime() - seconds * 1000);
    const result = escalationCandidates(
      [
        { id: 'old', status: 'open', createdAt: at(130), receipts: 2 },
        { id: 'silent', status: 'open', createdAt: at(20), receipts: 0 },
        { id: 'fresh', status: 'open', createdAt: at(5), receipts: 0 },
        { id: 'claimed', status: 'claimed', createdAt: at(300), receipts: 0 },
      ],
      now,
    );
    expect(result).toEqual({ unclaimed: ['old'], noAck: ['silent'] });
  });

  it('counts whole minutes', () => {
    const created = '2026-11-03T10:00:00.000Z';
    expect(minutesSince(created, Date.parse(created) + 119_000)).toBe(1);
    expect(minutesSince(created, Date.parse(created) - 5_000)).toBe(0);
  });
});
