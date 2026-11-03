import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { clientIp } from '@/lib/http/client-ip';
import { AppError, toErrorBody } from '@/lib/errors';
import { log } from '@/lib/log';
import { RATE_RULES, rateLimiter, type RateRule } from '@/lib/rate-limit';
import {
  CLIENT_SESSION_COOKIE,
  verifyClientSession,
  type ClientSessionClaims,
} from './client-cookie';

/**
 * Shared plumbing of the public Route Handlers (ADR-0016): per-IP limits, Zod-validated
 * bodies, the signed session cookie and the `{ code, message, details? }` error contract.
 */

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

export async function readJson<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError('VALIDATION_FAILED', 'Body must be JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_FAILED', 'Invalid body', {
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0] ?? 'body'), issue.message]),
      ),
    });
  }
  return parsed.data;
}

/** The phone's session from its signed cookie, or SESSION_EXPIRED. */
export async function requireClientSession(request: NextRequest): Promise<ClientSessionClaims> {
  const claims = await verifyClientSession(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
  if (!claims) throw new AppError('SESSION_EXPIRED', 'No valid session cookie');
  return claims;
}

/** AppErrors keep their code and status; anything else is logged and hidden. */
export function errorResponse(error: unknown, operation: string): NextResponse {
  if (!(error instanceof AppError)) {
    log.error('public_api.failed', { operation, cause: String(error) });
  }
  const { status, body } = toErrorBody(error);
  const response = NextResponse.json(body, { status });
  const retryAfter = error instanceof AppError ? error.details?.retryAfterSeconds : undefined;
  if (typeof retryAfter === 'number') response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
