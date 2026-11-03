import 'server-only';
import type { NextRequest } from 'next/server';
import { clientIp } from '@/lib/http/client-ip';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { RATE_RULES, rateLimiter, type RateRule } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import {
  CLIENT_SESSION_COOKIE,
  verifyClientSession,
  type ClientSessionClaims,
} from './client-cookie';

/**
 * Shared plumbing of the public Route Handlers (ADR-0016): per-IP limits, Zod-validated
 * bodies, the signed session cookie and the `{ code, message, details? }` error contract.
 */

/**
 * Anomaly heuristic (ADR-0011 §3): past a softer per-IP rate, opening a session needs a
 * verified Turnstile token. A normal café never sees the challenge.
 */
export async function requireHumanOnAnomaly(
  request: NextRequest,
  turnstileToken: string | undefined,
): Promise<void> {
  const ip = clientIp(request.headers);
  const result = await rateLimiter().hit(RATE_RULES.sessionAnomaly, ip);
  if (result.ok) return;
  const verified =
    turnstileToken !== undefined &&
    (await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, ip === 'unknown' ? null : ip));
  if (!verified) throw new AppError('CHALLENGE_REQUIRED', 'Turnstile token required');
}

/** Per-IP limits; a café shares one IP, so these only stop floods. */
export async function limitByIp(
  request: NextRequest,
  rules: readonly RateRule[] = [RATE_RULES.publicIp],
): Promise<void> {
  const ip = clientIp(request.headers);
  for (const rule of rules) {
    const result = await rateLimiter().hit(rule, ip);
    if (!result.ok) {
      throw new AppError('RATE_LIMITED', 'Too many requests', {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
  }
}

/** The phone's session from its signed cookie, or SESSION_EXPIRED. */
export async function requireClientSession(request: NextRequest): Promise<ClientSessionClaims> {
  const claims = await verifyClientSession(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
  if (!claims) throw new AppError('SESSION_EXPIRED', 'No valid session cookie');
  return claims;
}

export { errorResponse, readJson } from '@/lib/http/route';
