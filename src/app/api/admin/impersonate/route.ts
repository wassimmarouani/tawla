import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionClaims } from '@/lib/auth/session';
import { startImpersonation, stopImpersonation } from '@/server/admin/impersonation';

const startSchema = z.object({
  restaurantId: z.uuid(),
  reason: z.string().min(3).max(200),
});

/** POST /api/admin/impersonate — Super Admin starts impersonating a venue's primary owner. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const claims = await getSessionClaims();
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  try {
    await startImpersonation(claims, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL';
    return NextResponse.json({ code: 'FORBIDDEN', message }, { status: 403 });
  }
  redirect('/dashboard');
}

/** DELETE /api/admin/impersonate — stops the impersonation and returns to the admin console. */
export async function DELETE(): Promise<NextResponse> {
  await stopImpersonation();
  redirect('/admin');
}
