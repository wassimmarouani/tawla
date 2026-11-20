import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from 'cn';
import { formatTND, type MoneyContext, type MoneyLocale } from '@/lib/money';

/**
 * PriceTag — renders an integer-millime amount with {@link formatTND}, tabular figures so columns
 * of prices align. The server always recomputes totals; this is display only (CLAUDE.md rule 4).
 */
const priceTagVariants = cva('whitespace-nowrap tabular-nums', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-md font-semibold',
      lg: 'text-lg font-title tracking-heading',
    },
  },
  defaultVariants: { size: 'md' },
});

type PriceTagProps = Omit<React.ComponentProps<'span'>, 'children' | 'prefix'> &
  VariantProps<typeof priceTagVariants> & {
    millimes: number;
    locale: MoneyLocale;
    context?: MoneyContext;
    /** Localised "À partir de" / "من" prefix, shown muted before the amount. */
    prefix?: string;
  };

function PriceTag({
  className,
  size,
  millimes,
  locale,
  context = 'menu',
  prefix,
  ...props
}: PriceTagProps) {
  return (
    <span
      data-slot="price-tag"
      className={cn('inline-flex items-baseline gap-1', className)}
      {...props}
    >
      {prefix ? <span className="text-xs font-normal text-muted-foreground">{prefix}</span> : null}
      <span className={cn(priceTagVariants({ size }))}>
        {formatTND(millimes, { context, locale })}
      </span>
    </span>
  );
}

export { PriceTag, priceTagVariants };
export type { PriceTagProps };
