'use client';

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import type { ReactNode } from 'react';
import { cn } from 'cn';

interface SegmentedOption {
  value: string;
  label: string;
  /** Optional leading icon (lucide). The label stays visible for a11y. */
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  /** Accessible group name (localised). */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * SegmentedControl — a single-choice toggle with radiogroup semantics and native arrow-key roving
 * focus (via Base UI RadioGroup). The selected segment is marked both by fill and by aria-checked.
 */
function SegmentedControl({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
}: SegmentedControlProps) {
  return (
    <RadioGroupPrimitive
      aria-label={label}
      data-slot="segmented-control"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next)}
      disabled={disabled}
      className={cn(
        'inline-flex h-target items-center gap-1 rounded-sm border border-border bg-muted p-1 text-sm',
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-slot="segmented-control-item"
          className={cn(
            'inline-flex h-full min-w-16 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xs px-3.5 font-medium whitespace-nowrap text-muted-foreground transition-colors select-none',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted',
            'hover:text-foreground',
            'data-checked:bg-card data-checked:text-foreground data-checked:shadow-sm',
            'disabled:pointer-events-none disabled:opacity-50',
            '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          )}
        >
          {option.icon}
          {option.label}
        </RadioPrimitive.Root>
      ))}
    </RadioGroupPrimitive>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedOption };
