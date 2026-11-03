import { NextResponse, connection, type NextRequest } from 'next/server';
import { availabilityQuerySchema, errorResponse, limitByIp } from '@/features/table-service';
import { AppError } from '@/lib/errors';
import { menuAvailability } from '@/server/admin/table-service';

/** GET /api/public/availability?slug=: live availability for refreshes on focus. Read-only. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Per-request data: never prerendered (Cache Components).
  await connection();
  try {
    await limitByIp(request);
    const query = availabilityQuerySchema.safeParse({
      slug: request.nextUrl.searchParams.get('slug'),
    });
    if (!query.success) throw new AppError('VALIDATION_FAILED', 'slug required');
    const availability = await menuAvailability(query.data.slug);
    if (!availability) throw new AppError('NOT_FOUND', 'Unknown menu');
    return NextResponse.json(availability, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'availability.read');
  }
}
