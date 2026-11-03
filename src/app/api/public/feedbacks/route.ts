import { NextResponse, type NextRequest } from 'next/server';
import {
  FEEDBACK_PER_SESSION,
  errorResponse,
  feedbackSchema,
  limitByIp,
  readJson,
  requireClientSession,
} from '@/features/table-service';
import { createFeedback } from '@/server/admin/table-service';

/** POST /api/public/feedbacks: a rating after the bill (spec 02). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await limitByIp(request);
    const session = await requireClientSession(request);
    const input = await readJson(request, feedbackSchema);
    await createFeedback({
      restaurantId: session.r,
      clientSessionId: session.cs,
      rating: input.rating,
      comment: input.comment,
      maxPerSession: FEEDBACK_PER_SESSION,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, 'feedbacks.create');
  }
}
