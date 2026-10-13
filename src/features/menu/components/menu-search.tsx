'use client';

import { lazy, Suspense, useState } from 'react';
import type { LocalizedText } from '../schemas/public-menu';

export interface SearchItem {
  id: string;
  slug: string;
  name: LocalizedText;
  /** Formatted price line, or the sold-out label. */
  price: string;
  available: boolean;
  /** All names of the product and its category, every language (ADR-0026 §5). */
  search: string;
}

export interface SearchLabels {
  placeholder: string;
  label: string;
  close: string;
  empty: string;
  hint: string;
  /** Result counts per plural category, `#` standing for the number. */
  results: Readonly<Record<string, string>>;
}

const loadPanel = () => import('./search-panel');
const SearchPanel = lazy(loadPanel);

/**
 * Search entry point (ADR-0026 §5: loaded on focus). Only this pill ships with the menu; the
 * panel, uFuzzy and the index load on first intent (hover, focus or tap).
 */
export function MenuSearch({
  items,
  labels,
  locale,
}: {
  items: SearchItem[];
  labels: SearchLabels;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const warm = () => {
    void loadPanel();
  };

  return (
    <>
      <button
        type="button"
        onPointerEnter={warm}
        onFocus={warm}
        onClick={() => {
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="flex h-12 w-full items-center gap-3 rounded-full bg-muted px-4 text-start text-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="truncate">{labels.placeholder}</span>
      </button>
      {open ? (
        <Suspense fallback={null}>
          <SearchPanel
            items={items}
            labels={labels}
            locale={locale}
            onClose={() => {
              setOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
