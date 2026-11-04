import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getSessionClaims } from '@/lib/auth/session';

/** Console pages need a TOTP-verified session (ADR-0005): `aal1` goes to /admin/mfa first. */
export default function ConsoleLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  return (
    <Suspense>
      <RequireAal2>{children}</RequireAal2>
    </Suspense>
  );
}

async function RequireAal2({ children }: { children: ReactNode }) {
  const claims = await getSessionClaims();
  if (claims && claims.platform_role !== 'none' && claims.aal !== 'aal2') redirect('/admin/mfa');
  return children;
}
