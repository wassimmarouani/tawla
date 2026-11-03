import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryRateLimiter, upstashRateLimiter, type RateRule } from './rate-limit';

const RULE: RateRule = { name: 'test', limit: 2, windowSeconds: 60 };

describe('memoryRateLimiter', () => {
  it('allows up to the limit per window and subject, then reports the wait', async () => {
    let now = 120_000;
    const limiter = memoryRateLimiter(() => now);
    expect(await limiter.hit(RULE, 'a')).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect((await limiter.hit(RULE, 'a')).ok).toBe(true);
    expect(await limiter.hit(RULE, 'a')).toEqual({ ok: false, retryAfterSeconds: 60 });
    expect((await limiter.hit(RULE, 'b')).ok).toBe(true);
    now += 45_000;
    expect(await limiter.hit(RULE, 'a')).toEqual({ ok: false, retryAfterSeconds: 15 });
    now += 15_000;
    expect((await limiter.hit(RULE, 'a')).ok).toBe(true);
  });
});

describe('upstashRateLimiter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts through the REST pipeline', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([{ result: 3 }, { result: 1 }])));
    vi.stubGlobal('fetch', fetchMock);
    const limiter = upstashRateLimiter('https://redis.example', 'token', () => 120_000);
    expect(await limiter.hit(RULE, 'ip')).toEqual({ ok: false, retryAfterSeconds: 60 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://redis.example/pipeline');
    expect(JSON.parse(init.body as string)).toEqual([
      ['INCR', 'rl:test:ip:120000'],
      ['PEXPIRE', 'rl:test:ip:120000', '61000'],
    ]);
  });

  it('fails loudly when Redis is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(upstashRateLimiter('https://r', 't').hit(RULE, 'x')).rejects.toThrow('503');
  });
});
