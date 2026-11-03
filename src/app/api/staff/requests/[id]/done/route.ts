import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { staffContext } from '@/features/staff';
import { AppError } from '@/lib/errors';
import { errorResponse } from '@/lib/http/route';
import { completeRequest, resolveIncidents } from '@/server/admin/staff-service';

/** POST /api/staff/requests/{id}/done (spec 03): conditional update, 409 when already handled. */
export async function POST(
  _request: NextRequest,
  { params }: RouteContext<'/api/staff/requests/[id]/done'>,
): Promise<NextResponse> {
  try {
    const { device, claims } = await staffContext();
    const id = z.uuid().safeParse((await params).id);
    if (!id.success) throw new AppError('VALIDATION_FAILED', 'Invalid request id');
    const result = await completeRequest({
      restaurantId: device.restaurantId,
      requestId: id.data,
      userId: claims.sub,
    });
    await resolveIncidents(id.data);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'staff.request_done');
  }
}
