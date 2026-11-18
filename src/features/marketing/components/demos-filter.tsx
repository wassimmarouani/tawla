'use client';

import {
  ArrowUpRight,
  Beer,
  Cake,
  Coffee,
  Eye,
  IceCreamBowl,
  MessageCircle,
  Pizza,
  Sandwich,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  coverImageUrl: string | null;
  planLabel: string | null;
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
  preview: string;
  tryLive: string;
  like: string;
  close: string;
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

/** Filter chips + premium demo grid. Clicking a card opens a phone-shaped preview modal. */
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
  const [preview, setPreview] = useState<FilterableDemo | null>(null);
  const visible = useMemo(
    () => (active === 'all' ? demos : demos.filter((demo) => demo.segment === active)),
    [active, demos],
  );
  const segmentLabel = (segment: DemoSegment): string => labels[segment];

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [preview]);

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
        {visible.map((demo) => (
          <li key={demo.slug}>
            <DemoCard
              demo={demo}
              typeLabel={segmentLabel(demo.segment)}
              labels={labels}
              onPreview={() => {
                setPreview(demo);
              }}
            />
          </li>
        ))}
      </ul>
      {preview ? (
        <PreviewModal
          demo={preview}
          labels={labels}
          onClose={() => {
            setPreview(null);
          }}
        />
      ) : null}
    </>
  );
}

function DemoCard({
  demo,
  typeLabel,
  labels,
  onPreview,
}: {
  demo: FilterableDemo;
  typeLabel: string;
  labels: DemosFilterLabels;
  onPreview: () => void;
}) {
  const Icon = ICONS[demo.segment];
  return (
    <article className="group relative flex h-full flex-col overflow-clip rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`${labels.preview} ${demo.name}`}
        className="relative block h-44 overflow-clip border-b border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: demo.brandColor }}
      >
        {demo.coverImageUrl ? (
          // Hotlinked Unsplash cover; brand color is the placeholder.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={demo.coverImageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <Icon
            aria-hidden="true"
            className="absolute -end-4 -bottom-4 size-40 text-background/20"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-scrim/5 via-transparent to-scrim/65" />
        <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
          <Icon aria-hidden="true" className="size-3.5" />
          {typeLabel}
        </span>
        <span className="absolute end-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:opacity-100">
          <Eye aria-hidden="true" className="size-3.5" />
          {labels.preview}
        </span>
      </button>
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
          {demo.planLabel ? (
            <span className="inline-flex items-center gap-1 self-start rounded-full border border-border bg-background px-2 py-0.5 text-2xs font-semibold tracking-label text-foreground uppercase">
              {demo.planLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground outline-none hover:border-brand hover:text-brand-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye aria-hidden="true" className="size-4" />
            {labels.preview}
          </button>
          {wa(labels, demo.name) ? (
            <a
              href={wa(labels, demo.name) ?? undefined}
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
  );
}

function PreviewModal({
  demo,
  labels,
  onClose,
}: {
  demo: FilterableDemo;
  labels: DemosFilterLabels;
  onClose: () => void;
}) {
  const whatsapp = wa(labels, demo.name);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-full w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-lg bg-card p-4 shadow-2xl sm:flex-row sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="absolute end-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-background/90 text-foreground outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <div className="flex flex-1 flex-col gap-3 sm:gap-4">
          <div>
            <p
              className="text-xs font-semibold tracking-label uppercase"
              style={{ color: demo.brandColor }}
            >
              {labels[demo.segment]}
            </p>
            <h2
              id="preview-title"
              className="font-heading text-2xl font-title text-foreground"
              dir="auto"
            >
              {demo.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" dir="auto">
              {demo.tagline}
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">
                {labels.counts
                  .replace('{categories}', String(demo.categoryCount))
                  .replace('{products}', String(demo.productCount))}
              </strong>
            </li>
          </ul>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Link
              href={`/${demo.slug}`}
              prefetch={false}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none hover:border-brand hover:text-brand-text focus-visible:ring-2 focus-visible:ring-ring"
            >
              {labels.tryLive}
              <ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {labels.like}
              </a>
            ) : null}
          </div>
        </div>
        <div className="relative mx-auto aspect-phone w-64 shrink-0 overflow-hidden rounded-2xl border-4 border-foreground bg-background shadow-xl max-h-sheet sm:w-72">
          <iframe
            src={`/${demo.slug}`}
            title={demo.name}
            loading="lazy"
            className="absolute inset-0 block size-full"
          />
        </div>
      </div>
    </div>
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

function wa(labels: DemosFilterLabels, venueName: string): string | null {
  if (!labels.whatsappHref) return null;
  const message = labels.whatsappMessage.replace('{name}', venueName);
  return `${labels.whatsappHref}?text=${encodeURIComponent(message)}`;
}
