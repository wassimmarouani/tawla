'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttributeChipsProps<T extends string> {
  label: string;
  values: readonly T[];
  labels: Readonly<Record<T, string>>;
  selected: readonly T[];
  onChange: (selected: T[]) => void;
}

/** Multi-select as toggle chips (badges, diets, allergens): one tap per value. */
export function AttributeChips<T extends string>({
  label,
  values,
  labels,
  selected,
  onChange,
}: AttributeChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onChange(on ? selected.filter((item) => item !== value) : [...selected, value]);
              }}
              className={cn(
                'inline-flex min-h-target items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 pointer-coarse:min-h-target',
                on
                  ? 'border-transparent bg-brand-subtle text-brand-on-subtle'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {on ? <Check aria-hidden="true" className="size-4" /> : null}
              {labels[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
