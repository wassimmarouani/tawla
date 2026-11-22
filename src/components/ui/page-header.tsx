import type { ReactNode } from 'react';
import { cn } from 'cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Secondary slot (filters, breadcrumbs). Rendered above the title. */
  eyebrow?: ReactNode;
  /** Actions slot — keep to one primary action plus optional secondary ones. */
  actions?: ReactNode;
  /** Heading level; defaults to h1 for a page root. */
  as?: 'h1' | 'h2';
  className?: string;
}

/** Consistent page/section header: title + subtitle on the start, actions on the end. */
function PageHeader({ title, subtitle, eyebrow, actions, as = 'h1', className }: PageHeaderProps) {
  const Title = as;
  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow}
        <Title className="text-2xl font-title tracking-title text-balance text-foreground">
          {title}
        </Title>
        {subtitle ? <p className="max-w-prose text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export { PageHeader };
export type { PageHeaderProps };
