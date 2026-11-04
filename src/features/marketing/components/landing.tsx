import {
  ArrowRight,
  BellRing,
  Coffee,
  Camera,
  ChevronDown,
  Languages,
  MessageCircle,
  Palette,
  QrCode,
  RefreshCw,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { qrSvg } from '@/lib/qr/qr-svg';
import { cn } from '@/lib/utils';
import { marketingHref } from '../services/paths';
import { DemoPhone } from './demo-phone';
import { whatsappHref } from './marketing-shell';

const BENEFITS = [
  { key: 'menu', Icon: RefreshCw },
  { key: 'service', Icon: BellRing },
  { key: 'languages', Icon: Languages },
  { key: 'setup', Icon: Timer },
] as const;

const STEPS = [
  { key: 'photo', Icon: Camera },
  { key: 'brand', Icon: Palette },
  { key: 'print', Icon: QrCode },
] as const;

const SEGMENTS = [
  { key: 'cafe', Icon: Coffee },
  { key: 'restaurant', Icon: UtensilsCrossed },
] as const;

const FAQ = ['app', 'internet', 'change', 'staff', 'data'] as const;

/** Path of the demo venue's public menu, or null when no demo is configured. */
function demoMenuPath(): string | null {
  return env.DEMO_MENU_SLUG ? `/${env.DEMO_MENU_SLUG}` : null;
}

/** Marketing home (P1-16): hero with the live demo, benefits, steps, pricing teaser, FAQ. */
export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const demo = demoMenuPath();
  const whatsapp = whatsappHref();

  return (
    <>
      <section className="overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-gutter py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <p className="rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand-on-subtle">
              {t('hero.eyebrow')}
            </p>
            <h1 className="font-heading text-3xl font-title tracking-title text-balance text-foreground sm:text-4xl xl:text-display-sm">
              {t('hero.title')}
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              {t('hero.description')}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                prefetch={false}
                className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
              >
                {t('hero.start')}
                <ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  rel="noopener noreferrer"
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
                >
                  <MessageCircle aria-hidden="true" />
                  {t('hero.whatsapp')}
                </a>
              ) : null}
            </div>
            {demo ? (
              <a
                href={demo}
                className={cn(buttonVariants({ variant: 'link' }), 'gap-2 text-md lg:hidden')}
              >
                <QrCode aria-hidden="true" />
                {t('hero.demo')}
              </a>
            ) : null}
          </div>
          {demo ? (
            <DemoPreview
              url={demo}
              title={t('hero.frame')}
              scan={t('hero.scan')}
              qrLabel={t('hero.qr')}
              demoLabel={t('hero.demo')}
            />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="segments" className="mx-auto max-w-6xl px-gutter pt-14 sm:pt-20">
        <h2
          id="segments"
          className="font-heading text-2xl font-title tracking-heading text-balance sm:text-3xl"
        >
          {t('segments.title')}
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {SEGMENTS.map(({ key, Icon }) => (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-md bg-brand-subtle p-6 text-brand-on-subtle sm:p-8"
            >
              <Icon aria-hidden="true" className="size-7" />
              <h3 className="text-xl font-semibold">{t(`segments.items.${key}.title`)}</h3>
              <p className="text-md text-pretty">{t(`segments.items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="benefits" className="mx-auto max-w-6xl px-gutter py-14 sm:py-20">
        <h2
          id="benefits"
          className="font-heading text-2xl font-title tracking-heading text-balance sm:text-3xl"
        >
          {t('benefits.title')}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(({ key, Icon }) => (
            <li key={key} className="flex gap-4 rounded-md border border-border bg-card p-5 sm:p-6">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-sm bg-brand-subtle text-brand-on-subtle"
              >
                <Icon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="text-lg font-semibold text-foreground">
                  {t(`benefits.items.${key}.title`)}
                </h3>
                <p className="text-md text-pretty text-muted-foreground">
                  {t(`benefits.items.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-gutter py-14 sm:py-20">
          <h2
            id="steps"
            className="font-heading text-2xl font-title tracking-heading text-balance sm:text-3xl"
          >
            {t('steps.title')}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ key, Icon }, index) => (
              <li key={key} className="flex flex-col gap-3">
                <span className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-semibold text-on-brand">
                    {index + 1}
                  </span>
                  <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {t(`steps.items.${key}.title`)}
                </h3>
                <p className="text-md text-pretty text-muted-foreground">
                  {t(`steps.items.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-gutter py-14 sm:py-20">
        <div className="flex flex-col items-start gap-5 rounded-lg bg-brand-panel p-6 text-brand-on-panel sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="font-heading text-2xl font-title tracking-heading text-balance">
              {t('pricingTeaser.title')}
            </h2>
            <p className="text-md text-pretty text-brand-on-panel/85">{t('pricingTeaser.body')}</p>
          </div>
          <Link
            href={marketingHref(locale, '/pricing')}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'gap-2 border-transparent',
            )}
          >
            {t('pricingTeaser.cta')}
            <ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-gutter pb-16 sm:pb-24">
        <h2
          id="faq"
          className="font-heading text-2xl font-title tracking-heading text-balance sm:text-3xl"
        >
          {t('faq.title')}
        </h2>
        <div className="mt-6 divide-y divide-border rounded-md border border-border bg-card">
          {FAQ.map((key) => (
            <details key={key} className="group">
              <summary className="flex min-h-target-staff cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-md font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                {t(`faq.items.${key}.q`)}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="px-5 pb-5 text-md text-pretty text-muted-foreground">
                {t(`faq.items.${key}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

interface DemoPreviewProps {
  url: string;
  title: string;
  scan: string;
  qrLabel: string;
  demoLabel: string;
}

/** Large screens: the live demo menu in a phone, and a QR code to open it on a real phone. */
function DemoPreview({ url, title, scan, qrLabel, demoLabel }: DemoPreviewProps) {
  // The QR code needs the absolute URL; the frame and link stay same-origin.
  const qr = qrSvg(`${env.NEXT_PUBLIC_APP_URL}${url}`);
  return (
    <div className="relative hidden items-end justify-center gap-6 lg:flex">
      <DemoPhone src={url} title={title} />
      <div className="mb-8 flex w-44 flex-col items-center gap-3 rounded-md border border-border bg-card p-4 text-center shadow-lg">
        <svg
          viewBox={`0 0 ${String(qr.size)} ${String(qr.size)}`}
          role="img"
          aria-label={qrLabel}
          shapeRendering="crispEdges"
          className="size-32 rounded-xs"
        >
          <rect width={qr.size} height={qr.size} className="fill-on-scrim" />
          <path d={qr.path} className="fill-scrim" />
        </svg>
        <p className="text-sm text-pretty text-muted-foreground">{scan}</p>
        <a
          href={url}
          className="inline-flex min-h-target items-center rounded-xs text-sm font-semibold text-brand-text underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {demoLabel}
        </a>
      </div>
    </div>
  );
}
