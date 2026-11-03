import { NextResponse, type NextRequest } from 'next/server';
import { errorResponse, limitByIp, menuViewSchema, readJson } from '@/features/table-service';
import { recordMenuView } from '@/server/admin/table-service';

/** POST /api/public/menu-views: one view for statistics (sent by the page, never by GET). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await limitByIp(request);
    await recordMenuView(await readJson(request, menuViewSchema));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, 'menu_views.create');
  }
}
