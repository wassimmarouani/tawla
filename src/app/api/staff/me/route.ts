import { NextResponse, connection } from 'next/server';
import { staffContext } from '@/features/staff';
import { errorResponse } from '@/lib/http/route';

/**
 * GET /api/staff/me: who is signed in on this paired device. 401 DEVICE_NOT_PAIRED once the
 * device is revoked, 401 UNAUTHENTICATED without a live staff session (ADR-0010). Read-only.
 */
export async function GET(): Promise<NextResponse> {
  await connection();
  try {
    const { device, session } = await staffContext();
    return NextResponse.json(
      {
        device: { id: device.id, label: device.label, mode: device.mode },
        restaurant: { id: device.restaurantId, name: device.restaurantName },
        membership: { id: session.membershipId, role: session.role },
        expiresAt: session.expiresAt,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error, 'staff.me');
  }
}
