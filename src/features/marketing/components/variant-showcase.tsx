import { ArrowUpRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n/locales';
import { cn } from '@/lib/utils';

/**
 * Four hand-picked demo venues shown as small device tiles (A2 — "it works for every type of
 * venue"). Hard-coded so this section stays data-less and never waits on the catalog: the
 * canonical records live in `src/server/admin/demo-venue.ts`. Each tile links to the live menu.
 * On mobile the row scrolls horizontally with snap; on lg+ it lays out as four columns.
 */
const SHOWCASE_VENUES = [
  {
    slug: 'cafe-el-bahja',
    name: 'Café El Bahja',
    brandColor: '#b4532a',
    initials: 'EB',
    segmentKey: 'cafe',
  },
  {
    slug: 'bar-citadelle',
    name: 'Bar Citadelle',
    brandColor: '#111827',
    initials: 'BC',
    segmentKey: 'bar',
  },
  {
    slug: 'patisserie-nordique',
    name: 'Pâtisserie Nordique',
    brandColor: '#1e40af',
    initials: 'PN',
    segmentKey: 'pastry',
  },
  {
    slug: 'glacier-sorbetto',
    name: 'Glacier Sorbetto',
    brandColor: '#db2777',
    initials: 'GS',
    segmentKey: 'glacier',
  },
] as const;

export async function VariantShowcase({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });

  return (
    <section aria-labelledby="showcase" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
      <div className="flex max-w-2xl reveal flex-col gap-3">
        <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
          {t('showcase.eyebrow')}
        </p>
        <h2
          id="showcase"
          className="font-heading text-2xl font-title tracking-heading text-balance text-foreground sm:text-3xl lg:text-4xl"
        >
          {t('showcase.title')}
        </h2>
        <p className="text-lg text-pretty text-muted-foreground">{t('showcase.description')}</p>
      </div>

      <ul className="scroll-px-gutter mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {SHOWCASE_VENUES.map((venue) => (
          <li key={venue.slug} className="min-w-64 shrink-0 reveal snap-start lg:min-w-0">
            <Link
              href={`/${venue.slug}`}
              prefetch={false}
              className={cn(
                'group relative flex h-full flex-col gap-4 overflow-clip rounded-lg border border-border bg-card p-4 shadow-sm transition outline-none',
                'hover:-translate-y-1 hover:border-brand hover:shadow-xl',
                'focus-visible:ring-2 focus-visible:ring-ring',
                'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
              )}
            >
              <ShowcasePhone brandColor={venue.brandColor} initials={venue.initials} />
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: venue.brandColor }}
                    />
                    <span className="truncate text-xs font-semibold tracking-label text-muted-foreground uppercase">
                      {t(`demos.filters.${venue.segmentKey}`)}
                    </span>
                  </span>
                  <h3 className="truncate text-lg font-semibold text-foreground" dir="auto">
                    {venue.name}
                  </h3>
                  <p className="text-sm text-pretty text-muted-foreground">
                    {t(`showcase.items.${venue.slug}`)}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle transition group-hover:bg-brand group-hover:text-on-brand"
                >
                  <ArrowUpRight className="size-4 rtl:-scale-x-100" />
                </span>
              </div>
              <span className="sr-only">{t('showcase.view', { name: venue.name })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Lightweight CSS phone shell: a brand-gradient fill with the venue's initials. Pure markup,
 * no image load, so showing four tiles has zero network cost.
 */
function ShowcasePhone({ brandColor, initials }: { brandColor: string; initials: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-56 w-32 overflow-hidden rounded-xl border-4 border-foreground bg-foreground shadow-xl transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    >
      <span className="absolute inset-x-0 top-1 z-10 mx-auto h-1 w-10 rounded-full bg-background/80" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(140deg, ${brandColor}, color-mix(in oklab, ${brandColor} 60%, black))`,
        }}
      />
      <div className="relative flex h-full flex-col items-center justify-between p-4 text-on-brand">
        <span className="mt-4 grid size-10 place-items-center rounded-full bg-background/20 font-heading text-base font-title tracking-heading text-background backdrop-blur-sm">
          {initials}
        </span>
        <div className="flex w-full flex-col gap-1.5 pb-2">
          <span className="h-1.5 w-full rounded-full bg-background/40" />
          <span className="h-1.5 w-3/4 rounded-full bg-background/30" />
          <span className="h-1.5 w-5/6 rounded-full bg-background/30" />
          <span className="h-1.5 w-2/3 rounded-full bg-background/25" />
        </div>
      </div>
    </div>
  );
}
