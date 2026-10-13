import { cn } from '@/lib/utils';

interface LogoProps {
  /** Product name (`NEXT_PUBLIC_APP_NAME`); the mark alone is decorative. */
  name: string;
  showName?: boolean;
  className?: string;
}

/**
 * Platform mark (ADR-0029): a table seen from above with a QR corner, in the current colour.
 * Working name only (`APP_NAME`); swap the glyph when the brand is final.
 */
export function Logo({ name, showName = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-8 shrink-0 text-brand"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="26" height="26" rx="8" fill="currentColor" stroke="none" />
        <circle cx="16" cy="16" r="6.5" className="stroke-on-brand" />
        <path d="M8.5 8.5h3v3h-3z" className="fill-on-brand stroke-none" />
        <path d="M20.5 20.5h3v3h-3z" className="fill-on-brand stroke-none" />
      </svg>
      {showName ? (
        <span className="text-lg font-title tracking-heading text-foreground">{name}</span>
      ) : (
        <span className="sr-only">{name}</span>
      )}
    </span>
  );
}
