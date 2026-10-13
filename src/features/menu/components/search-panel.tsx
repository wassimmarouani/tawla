'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { directionOf, isLocale } from '@/i18n/locales';
import { classes as cn } from '@/lib/classes';
import { buildSearchIndex, searchMenu } from '../services/search';
import type { SearchItem, SearchLabels } from './menu-search';

const MAX_RESULTS = 30;

interface SearchPanelProps {
  items: SearchItem[];
  labels: SearchLabels;
  locale: string;
  onClose: () => void;
}

/** Full-screen search over the loaded menu (lazy chunk with uFuzzy and the index). */
export default function SearchPanel({ items, labels, locale, onClose }: SearchPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildSearchIndex(items), [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const results = useMemo(
    () =>
      searchMenu(index, query)
        .slice(0, MAX_RESULTS)
        .map((id) => byId.get(id))
        .filter((item): item is SearchItem => item !== undefined),
    [index, byId, query],
  );
  const searching = query.trim().length >= 2;
  const plural = new Intl.PluralRules(locale).select(results.length);
  const count = (
    results.length === 0 ? labels.results.zero : (labels.results[plural] ?? labels.results.other)
  )?.replace('#', String(results.length));

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={labels.label}
      onClose={onClose}
      className="m-0 h-dvh max-h-dvh w-full max-w-full border-0 bg-background p-0 text-foreground backdrop:bg-scrim/60 sm:mx-auto sm:mt-16 sm:h-auto sm:max-w-xl sm:rounded-lg sm:shadow-lg sm:max-h-sheet"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-gutter pt-safe pb-3 sm:pt-3">
        <input
          type="search"
          autoFocus
          dir="auto"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder={labels.placeholder}
          aria-label={labels.label}
          enterKeyHint="search"
          className="mt-3 h-12 min-w-0 flex-1 rounded-full bg-muted px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-0"
        />
        <form method="dialog" className="mt-3 sm:mt-0">
          <button
            type="submit"
            aria-label={labels.close}
            className="grid size-target place-items-center rounded-full text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </form>
      </div>

      <div className="px-gutter pb-safe">
        <p role="status" className="py-3 text-sm text-muted-foreground">
          {searching ? (results.length > 0 ? count : labels.empty) : labels.hint}
        </p>
        {results.length > 0 ? (
          <ul className="divide-y divide-border">
            {results.map((item) => {
              const foreign = item.name.lang !== locale;
              return (
                <li key={item.id}>
                  <Link
                    href={`?p=${encodeURIComponent(item.slug)}`}
                    scroll={false}
                    prefetch={false}
                    onClick={() => dialog.current?.close()}
                    className="flex min-h-target items-center justify-between gap-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      lang={foreign ? item.name.lang : undefined}
                      dir={
                        foreign && isLocale(item.name.lang)
                          ? directionOf(item.name.lang)
                          : undefined
                      }
                      className={cn(
                        'font-semibold',
                        item.available ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {item.name.text}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {item.price}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </dialog>
  );
}
