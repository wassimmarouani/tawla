'use client';

import {
  ArrowUpRight,
  Beer,
  Cake,
  Coffee,
  IceCreamBowl,
  MessageCircle,
  Pizza,
  Sandwich,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type DemoSegment = 'cafe' | 'italian' | 'pastry' | 'bar' | 'street' | 'glacier';

export interface FilterableDemo {
  slug: string;
  name: string;
  segment: DemoSegment;
  brandColor: string;
  productCount: number;
  categoryCount: number;
  tagline: string;
}

interface DemosFilterLabels {
  all: string;
  cafe: string;
  italian: string;
  pastry: string;
  bar: string;
  street: string;
  glacier: string;
  counts: string;
  tryLive: string;
  like: string;
  /** Pre-built wa.me URL without query string; empty when sales WhatsApp is not configured. */
  whatsappHref: string;
  /** Template literal that uses {name} for the venue name. */
  whatsappMessage: string;
}

const ICONS: Record<DemoSegment, typeof Coffee> = {
  cafe: Coffee,
  italian: Pizza,
  pastry: Cake,
  bar: Beer,
  street: Sandwich,
  glacier: IceCreamBowl,
};

/** Filter chips + grid of premium demo cards. Client-side so chips stay fast. */
export function DemosFilter({
  demos,
  segments,
  labels,
}: {
  demos: readonly FilterableDemo[];
  segments: readonly DemoSegment[];
  labels: DemosFilterLabels;
}) {
  const [active, setActive] = useState<DemoSegment | 'all'>('all');
  const visible = useMemo(
    () => (active === 'all' ? demos : demos.filter((demo) => demo.segment === active)),
    [active, demos],
  );
  const segmentLabel = (segment: DemoSegment): string => labels[segment];

  return (
    <>
      <div
        role="tablist"
        aria-label={labels.all}
        className="-mx-gutter mb-6 scrollbar-none flex gap-2 overflow-x-auto mask-fade-x px-gutter pb-1 sm:flex-wrap sm:overflow-visible"
      >
        <Chip
          label={labels.all}
          active={active === 'all'}
          onClick={() => {
            setActive('all');
          }}
        />
        {segments.map((segment) => {
          const Icon = ICONS[segment];
          return (
            <Chip
              key={segment}
              label={segmentLabel(segment)}
              icon={<Icon aria-hidden="true" className="size-3.5" />}
              active={active === segment}
              onClick={() => {
                setActive(segment);
              }}
            />
          );
        })}
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((demo) => {
          const Icon = ICONS[demo.segment];
          const whatsappFor = buildWhatsappHref(
            labels.whatsappHref,
            labels.whatsappMessage,
            demo.name,
          );
          return (
            <li key={demo.slug}>
              <article className="group flex h-full flex-col overflow-clip rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div
                  aria-hidden="true"
                  className="relative h-36 overflow-clip border-b border-border"
                  style={{ backgroundColor: demo.brandColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-background/15 via-transparent to-background/40" />
                  <Icon
                    aria-hidden="true"
                    className="absolute -end-4 -bottom-4 size-40 text-background/20"
                  />
                  <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground">
                    <Icon aria-hidden="true" className="size-3.5" />
                    {segmentLabel(demo.segment)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-foreground" dir="auto">
                      {demo.name}
                    </h3>
                    <p className="text-sm text-muted-foreground" dir="auto">
                      {demo.tagline}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {labels.counts
                        .replace('{categories}', String(demo.categoryCount))
                        .replace('{products}', String(demo.productCount))}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
                    <Link
                      href={`/${demo.slug}`}
                      prefetch={false}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground outline-none hover:border-brand hover:text-brand-text focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {labels.tryLive}
                      <ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
                    </Link>
                    {whatsappFor ? (
                      <a
                        href={whatsappFor}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MessageCircle aria-hidden="true" className="size-4" />
                        {labels.like}
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Chip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border bg-card text-muted-foreground hover:border-brand hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function buildWhatsappHref(baseHref: string, template: string, venueName: string): string | null {
  if (!baseHref) return null;
  const message = template.replace('{name}', venueName);
  const encoded = encodeURIComponent(message);
  return `${baseHref}?text=${encoded}`;
}
