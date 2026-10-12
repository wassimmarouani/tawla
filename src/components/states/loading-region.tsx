import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingRegionProps {
  /** Announced to screen readers ("Loading…"), from the messages files. */
  label: string;
  /** Skeletons with the final dimensions of the content (no layout shift). */
  children: ReactNode;
  className?: string;
}

/** Accessible loading placeholder: a polite live region wrapping decorative skeletons. */
export function LoadingRegion({ label, children, className }: LoadingRegionProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn(className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}
