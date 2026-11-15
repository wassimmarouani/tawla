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
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { Locale } from '@/i18n/locales';
import { landingDemos, type LandingDemo } from '../server/demos';
import { DemosFilter } from './demos-filter';
import { whatsappHref } from './marketing-shell';

/**
 * "Démos en direct" landing section (A2 — ait-tun.com style): one premium card per installed
 * demo venue. Each card has two actions: "Try the menu live" (opens the real public menu) and
 * "I love this template" (prefilled WhatsApp to sales for a custom build). Filter chips let the
 * visitor focus by segment.
 */
export async function DemosSection({ locale }: { locale: Locale }) {
  await connection();
  const demos = await landingDemos();
  if (demos.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'marketing.demos' });
  const whatsapp = whatsappHref();

  const segments = Array.from(new Set(demos.map((demo) => demo.segment)));

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
      <DemosFilter
        demos={demos.map((demo) => ({
          slug: demo.slug,
          name: demo.name,
          segment: demo.segment,
          brandColor: demo.brandColor,
          productCount: demo.productCount,
          categoryCount: demo.categoryCount,
          tagline: tagline(demo, locale),
        }))}
        segments={segments}
        labels={{
          all: t('filters.all'),
          cafe: t('filters.cafe'),
          italian: t('filters.italian'),
          pastry: t('filters.pastry'),
          bar: t('filters.bar'),
          street: t('filters.street'),
          glacier: t('filters.glacier'),
          counts: t('counts'),
          tryLive: t('tryLive'),
          like: t('like'),
          whatsappHref: whatsapp ?? '',
          whatsappMessage: t('whatsappMessage'),
        }}
      />
    </section>
  );
}

function tagline(demo: LandingDemo, locale: Locale): string {
  if (locale === 'ar') return demo.taglineAr;
  if (locale === 'en') return demo.taglineEn;
  return demo.taglineFr;
}

/** Icons per segment, mirrored by the client DemosFilter component. */
export const SEGMENT_ICONS = {
  cafe: Coffee,
  italian: Pizza,
  pastry: Cake,
  bar: Beer,
  street: Sandwich,
  glacier: IceCreamBowl,
} as const;

// Re-exports used by the client filter component so it stays decorative-only.
export { ArrowUpRight, MessageCircle };
