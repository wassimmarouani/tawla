import { ArrowUpRight, Cake, Coffee, Pizza, UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { connection } from 'next/server';
import type { Locale } from '@/i18n/locales';
import { landingDemos, type LandingDemo } from '../server/demos';

/**
 * "Démos en direct" landing section (A2 — see ait-tun.com style): one card per installed demo
 * venue. Each card opens the real public menu in a new tab. Rendered inside a Suspense from the
 * landing because the DB read (even cached) must not block the static hero (ADR-0017).
 */
export async function DemosSection({ locale }: { locale: Locale }) {
  await connection();
  const demos = await landingDemos();
  if (demos.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'marketing.demos' });
  const types = await getTranslations({ locale, namespace: 'onboarding.venueTypes' });

  return (
    <section aria-labelledby="demos" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-label text-brand-text uppercase">
          {t('eyebrow')}
        </p>
        <h2
          id="demos"
          className="font-heading text-3xl font-title tracking-title text-balance sm:text-4xl"
        >
          {t('title')}
        </h2>
        <p className="max-w-2xl text-md leading-relaxed text-pretty text-muted-foreground">
          {t('intro')}
        </p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => (
          <li key={demo.slug}>
            <DemoCard demo={demo} typeLabel={safeType(types, demo.type)} tryLabel={t('try')} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DemoCard({
  demo,
  typeLabel,
  tryLabel,
}: {
  demo: LandingDemo;
  typeLabel: string;
  tryLabel: string;
}) {
  const Icon = ICONS[demo.type];
  return (
    <Link
      href={`/${demo.slug}`}
      prefetch={false}
      target="_blank"
      rel="noopener"
      className="group relative flex h-full flex-col overflow-clip rounded-lg border border-border bg-card transition outline-none hover:border-brand focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        aria-hidden="true"
        className="relative h-40 overflow-clip border-b border-border"
        style={{ backgroundColor: demo.brandColor }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-background/30" />
        <Icon aria-hidden="true" className="absolute -end-4 -bottom-4 size-40 text-background/20" />
        <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground">
          <Icon aria-hidden="true" className="size-3.5" />
          {typeLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-foreground" dir="auto">
          {demo.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {demo.categoryCount} × {demo.productCount}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-brand-text">
          {tryLabel}
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100"
          />
        </span>
      </div>
    </Link>
  );
}

const ICONS = {
  cafe: Coffee,
  restaurant: Pizza,
  tea_room: Coffee,
  pastry: Cake,
  fast_food: UtensilsCrossed,
} as const;

const TYPE_KEYS = ['cafe', 'restaurant', 'tea_room', 'pastry', 'fast_food'] as const;
type VenueTypeKey = (typeof TYPE_KEYS)[number];

function safeType(types: (key: VenueTypeKey) => string, value: string): string {
  return (TYPE_KEYS as readonly string[]).includes(value) ? types(value as VenueTypeKey) : value;
}
