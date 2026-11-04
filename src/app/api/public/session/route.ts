import { NextResponse, connection, type NextRequest } from 'next/server';
import {
  CLIENT_SESSION_COOKIE,
  errorResponse,
  limitByIp,
  sessionQuerySchema,
  verifyClientSession,
} from '@/features/table-service';
import { AppError } from '@/lib/errors';
import { clientSessionState } from '@/server/admin/table-service';

/**
 * GET /api/public/session?token=: the phone's table session (requests, cooldowns, feedback),
 * refetched on load, focus and realtime (re)connect (ADR-0008 §6). Read-only; `{ state: null }`
 * when the phone has no session at this table yet.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Per-request data: never prerendered (Cache Components).
  await connection();
  try {
    await limitByIp(request);
    const query = sessionQuerySchema.safeParse({
      token: request.nextUrl.searchParams.get('token'),
    });
    if (!query.success) throw new AppError('VALIDATION_FAILED', 'token required');
    const claims = await verifyClientSession(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
    const state = claims ? await clientSessionState(claims, query.data.token) : null;
    return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'session.read');
  }
}
