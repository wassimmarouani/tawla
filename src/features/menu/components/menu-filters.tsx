'use client';

import { useEffect, useState } from 'react';
import { classes as cn } from '@/lib/classes';
import { MENU_FILTERS, type MenuFilter } from './filters';

interface MenuFiltersProps {
  label: string;
  names: Readonly<Record<MenuFilter, string>>;
}

/**
 * Optional dish filters (spec 02). Products and sections carry their tags in data attributes,
 * so filtering hides server-rendered nodes instead of re-rendering the menu: a few lines of
 * JavaScript, no data shipped. Filters combine (a dish must match all of them).
 */
export function MenuFilters({ label, names }: MenuFiltersProps) {
  const [active, setActive] = useState<MenuFilter[]>([]);

  useEffect(() => {
    let visibleTotal = 0;
    for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
      let visible = 0;
      for (const product of section.querySelectorAll<HTMLElement>('[data-product]')) {
        const tags = (product.dataset.tags ?? '').split(' ');
        product.hidden = !active.every((filter) => tags.includes(filter));
        if (!product.hidden) visible += 1;
      }
      section.hidden = visible === 0;
      visibleTotal += visible;
      const chip = document.querySelector<HTMLElement>(`[data-chip="${section.id}"]`);
      if (chip) chip.hidden = section.hidden;
    }
    const empty = document.querySelector<HTMLElement>('[data-filter-empty]');
    if (empty) empty.hidden = visibleTotal > 0;
  }, [active]);

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {MENU_FILTERS.map((filter) => {
        const on = active.includes(filter);
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={on}
            onClick={() => {
              setActive((current) =>
                on ? current.filter((value) => value !== filter) : [...current, filter],
              );
            }}
            className={cn(
              'h-9 rounded-full border px-3.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-target',
              on
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-foreground',
            )}
          >
            {names[filter]}
          </button>
        );
      })}
    </div>
  );
}
