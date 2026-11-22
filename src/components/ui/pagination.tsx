import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  /** Localised range summary, e.g. "1–25 sur 240". */
  summary: string;
  /** Localised landmark + control labels. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

/** Prev/next pager with a live range summary. Chevrons mirror in RTL; ends are disabled, not hidden. */
function Pagination({
  summary,
  label,
  previousLabel,
  nextLabel,
  hasPrevious = true,
  hasNext = true,
  onPrevious,
  onNext,
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={label}
      data-slot="pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {summary}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={previousLabel}
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft className="rtl:-scale-x-100" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={nextLabel}
          disabled={!hasNext}
          onClick={onNext}
        >
          <ChevronRight className="rtl:-scale-x-100" />
        </Button>
      </div>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
