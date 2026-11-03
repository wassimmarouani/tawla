import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_TTL_SECONDS,
  DEVICE_COOKIE,
  DEVICE_TTL_SECONDS,
  cookieOptions,
  deviceIdSchema,
  errorResponse,
  limitByIp,
  openSessionSchema,
  readJson,
  signClientSession,
} from '@/features/table-service';
import { RATE_RULES } from '@/lib/rate-limit';
import { openClientSession } from '@/server/admin/table-service';

/**
 * POST /api/public/sessions (ADR-0011 §3): called on the first meaningful action at a table,
 * never on page load. Joins the table session and sets the signed session cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await limitByIp(request, [RATE_RULES.publicIp, RATE_RULES.sessionOpen]);
    const { token } = await readJson(request, openSessionSchema);
    const known = deviceIdSchema.safeParse(request.cookies.get(DEVICE_COOKIE)?.value);
    const deviceId = known.success ? known.data : randomBytes(16).toString('base64url');
    const session = await openClientSession(token, deviceId);

    const response = NextResponse.json(
      { tableSessionPublicId: session.tableSessionPublicId },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(
      CLIENT_SESSION_COOKIE,
      await signClientSession({
        cs: session.clientSessionId,
        ts: session.tableSessionId,
        r: session.restaurantId,
      }),
      cookieOptions(CLIENT_SESSION_TTL_SECONDS),
    );
    response.cookies.set(DEVICE_COOKIE, deviceId, cookieOptions(DEVICE_TTL_SECONDS));
    return response;
  } catch (error) {
    return errorResponse(error, 'sessions.open');
  }
}
