'use client';

import { BarChart3, BookOpen, LayoutDashboard, QrCode, Settings2, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { activeNavKey, type NavItem, type NavKey } from '../services/navigation';

const ICONS: Readonly<Record<NavKey, typeof BookOpen>> = {
  overview: LayoutDashboard,
  menu: BookOpen,
  tables: QrCode,
  analytics: BarChart3,
  team: Users,
  settings: Settings2,
};

interface NavLinksProps {
  /** `shortLabel` is the tab bar's visible text; `label` stays the accessible name. */
  items: readonly (NavItem & { label: string; shortLabel: string })[];
  label: string;
  /** `sidebar` from 1024 px, `tabbar` fixed at the bottom on phones and tablets. */
  variant: 'sidebar' | 'tabbar';
}

/** Back-office navigation with the current section marked (aria-current). */
export function NavLinks({ items, label, variant }: NavLinksProps) {
  const pathname = usePathname();
  const active = activeNavKey(items, pathname);

  if (variant === 'tabbar') {
    return (
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-home-indicator backdrop-blur-md lg:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const current = item.key === active;
            return (
              <li key={item.key} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 px-1 text-center text-xs leading-tight font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    current ? 'text-brand-text' : 'text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span className="max-w-full text-balance break-words">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const current = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-xs px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  current
                    ? 'bg-brand-subtle text-brand-on-subtle'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-4.5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
