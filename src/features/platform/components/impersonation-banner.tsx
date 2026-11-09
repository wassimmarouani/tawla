import { ShieldAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { activeImpersonation } from '../server/data';

/** Fixed banner shown on the dashboard while a Super Admin is impersonating a venue owner. */
export async function ImpersonationBanner() {
  const active = await activeImpersonation();
  if (!active) return null;
  const t = await getTranslations('admin');
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 border-b border-destructive/40 bg-destructive/15 px-gutter py-2.5 text-sm text-destructive"
    >
      <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex-1 font-semibold">{t('impersonation.banner')}</span>
      <Link
        href="/api/admin/impersonate/stop"
        prefetch={false}
        className="hover:text-on-destructive rounded-full border border-destructive px-3 py-1 text-xs font-semibold outline-none hover:bg-destructive focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('impersonation.stop')}
      </Link>
    </div>
  );
}
