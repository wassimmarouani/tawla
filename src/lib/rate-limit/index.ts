import 'server-only';
import { env } from '@/lib/env';
import {
  memoryRateLimiter,
  upstashRateLimiter,
  type RateLimiter,
  type RateRule,
} from './rate-limit';

export type { RateLimiter, RateResult, RateRule } from './rate-limit';

/** Default limits (ADR-0011 §7, ADR-0010 amendment); overridable later per restaurant. */
export const RATE_RULES = {
  /** Public endpoints per IP: a whole café shares one IP. */
  publicIp: { name: 'public.ip', limit: 120, windowSeconds: 60 },
  /** Session opens per IP (QR scans that actually interact). */
  sessionOpen: { name: 'public.session', limit: 30, windowSeconds: 60 },
  /** Anomaly heuristic: past this, opening a session needs a Turnstile token (ADR-0011 §3). */
  sessionAnomaly: { name: 'public.session.anomaly', limit: 20, windowSeconds: 60 },
  /** Auth Server Actions per IP and per email (Supabase sees only our server's IP). */
  authIp: { name: 'auth.ip', limit: 30, windowSeconds: 600 },
  authEmail: { name: 'auth.email', limit: 8, windowSeconds: 600 },
} as const satisfies Record<string, RateRule>;

let limiter: RateLimiter | undefined;

/**
 * Upstash when configured (hosted envs), in-memory otherwise (local, tests). Limits scale by
 * RATE_LIMIT_MULTIPLIER (1 in production).
 */
export function rateLimiter(): RateLimiter {
  if (!limiter) {
    const base =
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? upstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
        : memoryRateLimiter();
    const scale = env.RATE_LIMIT_MULTIPLIER;
    limiter = {
      hit: (rule, subject) => base.hit({ ...rule, limit: rule.limit * scale }, subject),
    };
  }
  return limiter;
}
