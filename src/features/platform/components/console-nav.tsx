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

const LINK_BASE =
  'inline-flex min-h-target items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LINK_ACTIVE = 'bg-brand-subtle text-brand-on-subtle';
const LINK_IDLE = 'text-muted-foreground hover:bg-accent hover:text-foreground';

function NavLink({ item, current }: { item: (typeof ITEMS)[number]; current: boolean }) {
  const t = useTranslations('admin');
  const { key, href, Icon } = item;
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(LINK_BASE, current ? LINK_ACTIVE : LINK_IDLE)}
    >
      <Icon aria-hidden="true" className="size-4" />
      {t(key)}
    </Link>
  );
}

/** Console top-nav with the current section marked (aria-current). Client-only for `usePathname`. */
export function ConsoleNav() {
  const pathname = usePathname();
  const onAudit = pathname.includes('/admin/audit');
  return (
    <>
      {ITEMS.map((item) => (
        <NavLink key={item.key} item={item} current={item.key === 'audit' ? onAudit : !onAudit} />
      ))}
    </>
  );
}

/**
 * Static fallback for the prerender shell: the same links in the idle state, with no `usePathname`,
 * so the Suspense boundary around `ConsoleNav` can prerender without `CLIENT_HOOK_DYNAMIC`. The real
 * active state streams in on hydration.
 */
export function ConsoleNavFallback() {
  return (
    <>
      {ITEMS.map((item) => (
        <NavLink key={item.key} item={item} current={false} />
      ))}
=======
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
