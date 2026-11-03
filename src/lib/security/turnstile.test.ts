import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const SECRET = '1x0000000000000000000000000000000AA';

const reply = (body: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body)));

describe('verifyTurnstile', () => {
  it('posts the secret, token and client IP to siteverify', async () => {
    const fetcher = reply({ success: true });
    await expect(verifyTurnstile(SECRET, 'token-1', '203.0.113.7', fetcher)).resolves.toBe(true);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init?.body as URLSearchParams;
    expect(body.get('response')).toBe('token-1');
    expect(body.get('remoteip')).toBe('203.0.113.7');
    expect(body.get('secret')).toBe(SECRET);
  });

  it('omits an unknown IP', async () => {
    const fetcher = reply({ success: true });
    await verifyTurnstile(SECRET, 'token-2', null, fetcher);
    expect((fetcher.mock.calls[0]?.[1]?.body as URLSearchParams).has('remoteip')).toBe(false);
  });

  it('rejects failed, malformed and unreachable verifications', async () => {
    await expect(
      verifyTurnstile(
        SECRET,
        'spent',
        null,
        reply({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      ),
    ).resolves.toBe(false);
    await expect(verifyTurnstile(SECRET, 'odd', null, reply({ ok: 1 }))).resolves.toBe(false);
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new Error('ENOTFOUND'));
    await expect(verifyTurnstile(SECRET, 'any', null, offline)).resolves.toBe(false);
  });
});
