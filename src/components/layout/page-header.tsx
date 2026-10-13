import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title (section name on detail pages). */
  eyebrow?: ReactNode;
  /** Primary page actions, end-aligned from 640 px, stacked below the title on phones. */
  actions?: ReactNode;
}

/** Back-office page header (spec 04 page template): the page's only h1. */
export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-title tracking-heading text-balance break-words text-foreground">
          {title}
        </h1>
        {description ? (
          <div className="max-w-prose text-md text-pretty text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
