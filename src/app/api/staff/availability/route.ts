import { NextResponse, connection, type NextRequest } from 'next/server';
import { z } from 'zod';
import { listAvailability, setAvailability, staffContext } from '@/features/staff';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { errorResponse, readJson } from '@/lib/http/route';

/** Staff availability list and one-tap toggle (spec 03, Basic: every staff role). */

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();
  try {
    const { device, claims } = await staffContext();
    const asked = request.nextUrl.searchParams.get('locale');
    const fallback = isLocale(device.defaultLocale) ? device.defaultLocale : DEFAULT_LOCALE;
    const items = await listAvailability(
      claims,
      device.restaurantId,
      isLocale(asked) ? asked : fallback,
      fallback,
    );
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'staff.availability_list');
  }
}

const toggleSchema = z.object({ productId: z.uuid(), isAvailable: z.boolean() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { device, claims } = await staffContext();
    const input = await readJson(request, toggleSchema);
    const result = await setAvailability(claims, device, input.productId, input.isAvailable);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'staff.availability_toggle');
  }
}
