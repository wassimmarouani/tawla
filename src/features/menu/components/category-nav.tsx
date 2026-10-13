'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { classes as cn } from '@/lib/classes';
import { CATEGORY_ANCHOR_PREFIX, categoryAnchor } from './anchors';

export interface CategoryLink {
  id: string;
  /** Rendered name (a Localized element, so fallback text keeps its lang). */
  label: ReactNode;
}

/**
 * Sticky category bar with scroll-spy (ADR-0029: outline pills, active = brand solid).
 * Works without JavaScript as plain anchors; with it, the active pill follows the reader and
 * scrolls itself into view.
 */
export function CategoryNav({ label, categories }: { label: string; categories: CategoryLink[] }) {
  const [active, setActive] = useState(categories[0]?.id);
  const chips = useRef(new Map<string, HTMLAnchorElement>());
  // A tapped category stays active while the page scrolls to it.
  const lockedUntil = useRef(0);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(categoryAnchor(category.id)))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockedUntil.current) return;
        // The last section can never reach the spy band: once the reader has scrolled to the
        // very end, it is the one they are reading. (A short menu that fits is not "scrolled".)
        const atBottom =
          window.scrollY > 0 &&
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        const last = categories.at(-1);
        if (atBottom && last) {
          setActive(last.id);
          return;
        }
        const visible = entries.filter((entry) => entry.isIntersecting);
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.slice(CATEGORY_ANCHOR_PREFIX.length));
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, [categories]);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chips.current.get(active)?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [active]);

  return (
    <nav
      aria-label={label}
      className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md"
    >
      <ul className="mx-auto scrollbar-none flex max-w-3xl gap-2 overflow-x-auto px-gutter py-2">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0" data-chip={categoryAnchor(category.id)}>
            <a
              ref={(node) => {
                if (node) chips.current.set(category.id, node);
                else chips.current.delete(category.id);
              }}
              href={`#${categoryAnchor(category.id)}`}
              aria-current={active === category.id ? 'true' : undefined}
              onClick={() => {
                lockedUntil.current = Date.now() + 1000;
                setActive(category.id);
              }}
              className={cn(
                'inline-flex h-target items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:transition-colors',
                active === category.id
                  ? 'border-brand-solid bg-brand-solid text-brand-on-solid'
                  : 'border-border bg-card text-foreground hover:bg-accent',
              )}
            >
              {category.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
