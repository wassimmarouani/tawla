import 'server-only';
import { headers } from 'next/headers';
import { actionError, type ActionResult } from '@/lib/errors';
import { clientIp } from '@/lib/http/client-ip';
import { RATE_RULES, rateLimiter } from '@/lib/rate-limit';

/**
 * Auth Server Actions run on our server, so Supabase Auth sees one IP for everyone and its own
 * limits are per IP (ADR-0010 amendment 2026-10-13): we limit per client IP and per email here.
 * Returns the error to send back, or `null` when the attempt may proceed.
 */
export async function authThrottle(email?: string): Promise<ActionResult<never> | null> {
  const limiter = rateLimiter();
  const checks = [limiter.hit(RATE_RULES.authIp, clientIp(await headers()))];
  if (email) checks.push(limiter.hit(RATE_RULES.authEmail, email.trim().toLowerCase()));
  const results = await Promise.all(checks);
  return results.every((result) => result.ok)
    ? null
    : actionError('RATE_LIMITED', 'Too many authentication attempts', 'rateLimited');
}
