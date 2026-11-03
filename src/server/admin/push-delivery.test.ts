import { describe, expect, it, vi } from 'vitest';
import { deliverPush, type PushSend, type PushTarget } from './push-delivery';

const target = (id: string): PushTarget => ({
  id,
  endpoint: `https://push.example.org/${id}`,
  p256dh: 'p256dh-key-0000000000',
  auth: 'auth-key-00',
});

const httpError = (statusCode: number) => Object.assign(new Error('push failed'), { statusCode });

describe('deliverPush', () => {
  it('sends the JSON payload and prunes subscriptions the push service reports gone', async () => {
    const send = vi.fn<PushSend>((subscription) => {
      if (subscription.id === 'gone') return Promise.reject(httpError(410));
      if (subscription.id === 'unknown') return Promise.reject(httpError(404));
      if (subscription.id === 'flaky') return Promise.reject(httpError(503));
      if (subscription.id === 'broken') return Promise.reject(new Error('socket hang up'));
      return Promise.resolve();
    });
    const prune = vi.fn(() => Promise.resolve());
    const report = await deliverPush(
      ['ok', 'gone', 'unknown', 'flaky', 'broken'].map(target),
      { title: 'Table 4', body: 'Appel serveur', tag: 'request-1', url: '/staff' },
      { send, prune },
    );
    expect(report.sent).toEqual(['ok']);
    expect(report.pruned.sort()).toEqual(['gone', 'unknown']);
    expect(report.failed.sort()).toEqual(['broken', 'flaky']);
    expect(prune).toHaveBeenCalledWith(expect.arrayContaining(['gone', 'unknown']));
    expect(JSON.parse(send.mock.calls[0]?.[1] ?? '{}')).toEqual({
      title: 'Table 4',
      body: 'Appel serveur',
      tag: 'request-1',
      url: '/staff',
    });
  });

  it('does not prune when every subscription is alive', async () => {
    const prune = vi.fn(() => Promise.resolve());
    await deliverPush(
      [target('a')],
      { title: 't', body: 'b' },
      { send: () => Promise.resolve(), prune },
    );
    expect(prune).not.toHaveBeenCalled();
  });
});
