import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from 'cn';

/**
 * StatusDot — a coloured dot plus a text label (never colour alone, WCAG 1.4.1).
 * The label carries the meaning; the dot is decorative. Pass the already-localised label.
 */
const dotVariants = cva('size-2 shrink-0 rounded-full', {
  variants: {
    variant: {
      neutral: 'bg-muted-foreground',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-destructive',
      info: 'bg-info',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

type StatusDotProps = React.ComponentProps<'span'> &
  VariantProps<typeof dotVariants> & {
    label: string;
    /** Hide the text and expose it only to assistive tech (e.g. in a dense table cell). */
    srOnly?: boolean;
  };

function StatusDot({ className, variant, label, srOnly = false, ...props }: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      className={cn('inline-flex items-center gap-2 text-sm text-foreground', className)}
      {...props}
    >
      <span aria-hidden="true" className={cn(dotVariants({ variant }))} />
      <span className={cn(srOnly && 'sr-only')}>{label}</span>
    </span>
  );
}

export { StatusDot, dotVariants };
export type { StatusDotProps };
