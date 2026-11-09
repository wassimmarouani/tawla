import { ExternalLink, MapPin, UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/states/empty-state';
import type { Locale } from '@/i18n/locales';
import { listPublicVenues, type DirectoryVenue } from '../server/directory';

/** `/venues`: public directory of venues that opted in, ordered by name, grouped by type. */
export async function DirectoryPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.directory' });
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-gutter py-10 sm:py-14">
      <header className="flex flex-col items-center gap-3 text-center">
        <p className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold tracking-label text-brand-on-subtle uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="font-heading text-3xl font-title tracking-title text-balance sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-pretty text-muted-foreground">
          {t('intro')}
        </p>
      </header>
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryList locale={locale} />
      </Suspense>
    </article>
  );
}

async function DirectoryList({ locale }: { locale: Locale }) {
  // Prevent the directory from being baked at build time (connection() opts out of PPR cache).
  await connection();
  const venues = await listPublicVenues();
  const t = await getTranslations({ locale, namespace: 'marketing.directory' });
  const types = await getTranslations({ locale, namespace: 'onboarding.venueTypes' });
  if (venues.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed />}
        title={t('empty.title')}
        description={t('empty.description')}
        className="bg-card py-16"
      />
    );
  }
  const groups = groupByType(venues);
  return (
    <div className="flex flex-col gap-10">
      {Object.entries(groups).map(([type, list]) => (
        <section key={type} aria-labelledby={`type-${type}`}>
          <h2 id={`type-${type}`} className="mb-4 text-xl font-semibold text-foreground">
            {safeType(types, type)}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((venue) => (
              <li key={venue.slug}>
                <Link
                  href={`/${venue.slug}`}
                  prefetch={false}
                  className="flex h-full flex-col gap-2 rounded-md border border-border bg-card p-5 outline-none hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2 text-md font-semibold text-foreground">
                    {venue.name}
                    <ExternalLink
                      aria-hidden="true"
                      className="ms-auto size-4 text-muted-foreground rtl:-scale-x-100"
                    />
                  </span>
                  {venue.address ? (
                    <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span dir="auto">{venue.address}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-28 animate-pulse rounded-md border border-border bg-muted/40"
        />
      ))}
    </div>
  );
}

function groupByType(venues: readonly DirectoryVenue[]): Record<string, DirectoryVenue[]> {
  const groups: Record<string, DirectoryVenue[]> = {};
  for (const venue of venues) {
    (groups[venue.type] ??= []).push(venue);
  }
  return groups;
}

const TYPE_KEYS = ['cafe', 'restaurant', 'tea_room', 'pastry', 'fast_food'] as const;
type VenueTypeKey = (typeof TYPE_KEYS)[number];

function isVenueTypeKey(value: string): value is VenueTypeKey {
  return (TYPE_KEYS as readonly string[]).includes(value);
}

function safeType(types: (key: VenueTypeKey) => string, type: string): string {
  return isVenueTypeKey(type) ? types(type) : type;
}
