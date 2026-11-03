/**
 * Rate limiting (ADR-0011 §7, docs/setup.md): one interface, two adapters. Upstash Redis in
 * hosted environments (shared by every serverless instance), in-memory locally and in tests.
 * Fixed windows: simple, cheap, and good enough for abuse limits (not billing).
 */
export interface RateRule {
  /** Short name, part of the key (`auth.login`, `public.ip`). */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateResult {
  ok: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  hit(rule: RateRule, subject: string): Promise<RateResult>;
}

function windowOf(rule: RateRule, now: number): { start: number; end: number } {
  const size = rule.windowSeconds * 1000;
  const start = Math.floor(now / size) * size;
  return { start, end: start + size };
}

function result(count: number, rule: RateRule, end: number, now: number): RateResult {
  const ok = count <= rule.limit;
  return { ok, retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((end - now) / 1000)) };
}

/** Process-local counters; expired windows are swept as keys are touched. */
export function memoryRateLimiter(clock: () => number = Date.now): RateLimiter {
  const counters = new Map<string, { count: number; end: number }>();
  return {
    hit(rule, subject) {
      const now = clock();
      const { start, end } = windowOf(rule, now);
      const key = `${rule.name}:${subject}:${String(start)}`;
      for (const [stale, entry] of counters) if (entry.end <= now) counters.delete(stale);
      const entry = counters.get(key) ?? { count: 0, end };
      entry.count += 1;
      counters.set(key, entry);
      return Promise.resolve(result(entry.count, rule, end, now));
    },
  };
}

/** Upstash Redis REST: INCR + PEXPIRE in one pipeline round trip. */
export function upstashRateLimiter(
  url: string,
  token: string,
  clock: () => number = Date.now,
): RateLimiter {
  return {
    async hit(rule, subject) {
      const now = clock();
      const { start, end } = windowOf(rule, now);
      const key = `rl:${rule.name}:${subject}:${String(start)}`;
      const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['PEXPIRE', key, String(end - now + 1000)],
        ]),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Upstash responded ${String(response.status)}`);
      const [incr] = (await response.json()) as [{ result?: unknown }];
      const count = typeof incr.result === 'number' ? incr.result : Number(incr.result);
      return result(Number.isFinite(count) ? count : 1, rule, end, now);
    },
  };
}
