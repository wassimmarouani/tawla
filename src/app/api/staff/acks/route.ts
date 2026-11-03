import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { staffContext } from '@/features/staff';
import { errorResponse, readJson } from '@/lib/http/route';
import { recordAcks } from '@/server/admin/staff-service';

/** POST /api/staff/acks: events this device rendered (ADR-0007 §3), batched and idempotent. */
const acksSchema = z.object({ events: z.array(z.uuid()).min(1).max(50) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { device, claims } = await staffContext();
    const { events } = await readJson(request, acksSchema);
    const recorded = await recordAcks({
      restaurantId: device.restaurantId,
      userId: claims.sub,
      deviceId: device.id,
      eventIds: events,
    });
    return NextResponse.json({ recorded }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'staff.acks');
  }
}
