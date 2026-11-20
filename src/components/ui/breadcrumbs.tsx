import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';

interface Crumb {
  label: string;
  /** Omit on the current page (the last crumb). */
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** Localised landmark label, e.g. "Fil d'Ariane". */
  label: string;
  /**
   * Link renderer — pass next-intl's <Link> so routing stays locale-aware.
   * Defaults to a plain <a>.
   */
  renderLink?: (href: string, children: ReactNode) => ReactNode;
  className?: string;
}

/** Accessible breadcrumb trail: nav > ol, chevrons mirror in RTL, last crumb is aria-current. */
function Breadcrumbs({ items, label, renderLink, className }: BreadcrumbsProps) {
  const link = renderLink ?? ((href, children) => <a href={href}>{children}</a>);
  return (
    <nav aria-label={label} data-slot="breadcrumbs" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {item.href && !isLast ? (
                <span className="rounded-xs underline-offset-4 hover:text-foreground hover:underline [&_a]:outline-none [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring">
                  {link(item.href, item.label)}
                </span>
              ) : (
                <span
                  className={cn(isLast && 'font-medium text-foreground')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 rtl:-scale-x-100" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumbs };
export type { BreadcrumbsProps, Crumb };
