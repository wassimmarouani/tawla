import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Decorative icon (lucide), rendered at 24 px inside a brand-tinted medallion. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** The next useful action ("Add your first category"), spec 10 UX principles. */
  action?: ReactNode;
  /** Render the title as a heading when the state is the page's main content. */
  headingLevel?: 1 | 2;
  className?: string;
}

/** Helpful empty state: always proposes the next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel,
  className,
}: EmptyStateProps) {
  const Title = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : 'p';
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-md border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle ring-8 ring-brand-subtle/40 [&_svg]:size-6"
      >
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <Title className="text-lg font-title tracking-heading text-foreground">{title}</Title>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
