'use client';

import { ListChecks, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { key: 'venues', href: '/admin', Icon: Store },
  { key: 'audit', href: '/admin/audit', Icon: ListChecks },
] as const;

/** Console top-nav with the current section marked (aria-current). Client-only for `usePathname`. */
export function ConsoleNav() {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const onAudit = pathname.includes('/admin/audit');

  return (
    <>
      {ITEMS.map(({ key, href, Icon }) => {
        const current = key === 'audit' ? onAudit : !onAudit;
        return (
          <Link
            key={key}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-target items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              current
                ? 'bg-brand-subtle text-brand-on-subtle'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </>
  );
}
