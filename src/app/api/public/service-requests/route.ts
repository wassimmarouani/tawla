import { NextResponse, after, type NextRequest } from 'next/server';
import {
  REQUEST_COOLDOWN_SECONDS,
  errorResponse,
  idempotencyKeySchema,
  limitByIp,
  readJson,
  requireClientSession,
  serviceRequestSchema,
  serviceRequestsEnabled,
} from '@/features/table-service';
import { AppError } from '@/lib/errors';
import { notifyStaffOfRequest } from '@/server/admin/staff-service';
import { createServiceRequest } from '@/server/admin/table-service';

/** POST /api/public/service-requests: "Call waiter" / "Request bill" (idempotent, cooldowns). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await limitByIp(request);
    const session = await requireClientSession(request);
    if (!(await serviceRequestsEnabled({ restaurantId: session.r }))) {
      throw new AppError('FORBIDDEN', 'Service requests are not part of this plan', {
        reason: 'feature',
      });
    }
    const key = idempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
    if (!key.success) throw new AppError('VALIDATION_FAILED', 'Idempotency-Key header required');
    const input = await readJson(request, serviceRequestSchema);
    const created = await createServiceRequest({
      restaurantId: session.r,
      clientSessionId: session.cs,
      tableToken: input.token,
      kind: input.kind,
      paymentMethod: input.paymentMethod,
      idempotencyKey: key.data,
      cooldownSeconds: REQUEST_COOLDOWN_SECONDS,
    });
    // Web Push after the response: the realtime broadcast already reached open staff screens.
    after(() => notifyStaffOfRequest({ restaurantId: session.r, requestId: created.id }));
    return NextResponse.json(created, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'service_requests.create');
  }
}
