import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';
import { stopImpersonation } from '@/server/admin/impersonation';

/**
 * GET /api/admin/impersonate/stop — convenience route called from the banner link. A form POST
 * would be more RESTful, but a plain link works without JavaScript and the DELETE helper audits
 * the end anyway. No CSRF window: the cookie it clears is harmless whoever triggers it.
 */
export async function GET(): Promise<NextResponse> {
  await stopImpersonation();
  redirect('/admin');
}
