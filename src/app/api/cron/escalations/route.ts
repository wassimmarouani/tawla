import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { errorResponse } from '@/lib/http/route';
import { hasBearer } from '@/lib/security/bearer';
import { escalateRequests } from '@/server/admin/staff-service';

/**
 * POST /api/cron/escalations (ADR-0007 §4, ADR-0009): called every 15 s by pg_cron + pg_net with
 * the cron secret. Idempotent.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!hasBearer(request.headers.get('authorization'), env.CRON_SECRET)) {
      throw new AppError('UNAUTHENTICATED', 'Cron secret required');
    }
    return NextResponse.json(await escalateRequests(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error, 'cron.escalations');
  }
}
