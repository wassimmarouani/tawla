import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

type DeltaDirection = 'up' | 'down' | 'neutral';

interface StatDelta {
  /** Already-formatted, localised value, e.g. "+12 %". */
  value: string;
  direction: DeltaDirection;
  /** Localised context for assistive tech, e.g. "vs. semaine dernière". */
  label?: string;
}

const DELTA_ICON: Record<DeltaDirection, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
};

const DELTA_TONE: Record<DeltaDirection, string> = {
  up: 'text-success',
  down: 'text-destructive-text',
  neutral: 'text-muted-foreground',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: StatDelta;
  /** Sparkline or mini-chart slot, rendered under the value. */
  children?: ReactNode;
  footnote?: string;
  loading?: boolean;
  className?: string;
}

/** Compact metric tile for the console/dashboard. Direction is shown by an arrow, never colour alone. */
function StatCard({ label, value, delta, children, footnote, loading, className }: StatCardProps) {
  const base = cn(
    'flex flex-col gap-2 rounded-md bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/5',
    className,
  );

  if (loading) {
    return (
      <div data-slot="stat-card" className={base} aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const DeltaIcon = delta ? DELTA_ICON[delta.direction] : null;

  return (
    <div data-slot="stat-card" className={base}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-title tracking-title tabular-nums">{value}</span>
        {delta && DeltaIcon ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              DELTA_TONE[delta.direction],
            )}
          >
            <DeltaIcon aria-hidden="true" className="size-4" />
            <span>{delta.value}</span>
            {delta.label ? <span className="sr-only">{delta.label}</span> : null}
          </span>
        ) : null}
      </div>
      {children}
      {footnote ? <p className="text-xs text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}

export { StatCard };
export type { StatCardProps, StatDelta, DeltaDirection };
