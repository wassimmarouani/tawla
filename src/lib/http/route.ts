import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { AppError, toErrorBody } from '@/lib/errors';
import { log } from '@/lib/log';

/** Route Handler plumbing shared by /api/public and /api/staff (ADR-0016). */

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
