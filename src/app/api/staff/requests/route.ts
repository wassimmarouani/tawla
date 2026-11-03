import { NextResponse, connection } from 'next/server';
import { staffContext } from '@/features/staff';
import { errorResponse } from '@/lib/http/route';
import { listLiveRequests } from '@/server/admin/staff-service';

/** GET /api/staff/requests: open and claimed requests of the venue (refetch on (re)connect). */
export async function GET(): Promise<NextResponse> {
  await connection();
  try {
    const { device } = await staffContext();
    const requests = await listLiveRequests(device.restaurantId);
    return NextResponse.json({ requests }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'staff.requests');
  }
}
