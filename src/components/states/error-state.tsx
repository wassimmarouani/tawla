import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Usually a "Try again" button. */
  action?: ReactNode;
  className?: string;
}

/** Inline, non-blocking error with its fix (spec 10: never a blocking dialog on the menu). */
export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-md bg-destructive-subtle p-4 text-destructive-text sm:flex-row sm:items-center',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-md font-semibold">{title}</p>
        {description ? <p className="text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
