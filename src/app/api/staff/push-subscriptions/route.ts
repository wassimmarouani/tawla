import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { staffContext } from '@/features/staff';
import { errorResponse, readJson } from '@/lib/http/route';
import { deleteSubscription, saveSubscription } from '@/server/admin/push';

/** Web Push subscriptions of the signed-in staff member on this paired device (ADR-0022 §3). */

const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(8).max(100),
  }),
});

const endpointSchema = z.object({ endpoint: z.url({ protocol: /^https$/ }).max(1000) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { device, session } = await staffContext();
    const input = await readJson(request, subscriptionSchema);
    await saveSubscription({
      restaurantId: device.restaurantId,
      membershipId: session.membershipId,
      deviceId: device.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, 'staff.push_subscribe');
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { device, session } = await staffContext();
    const { endpoint } = await readJson(request, endpointSchema);
    await deleteSubscription({
      restaurantId: device.restaurantId,
      membershipId: session.membershipId,
      endpoint,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, 'staff.push_unsubscribe');
  }
}
