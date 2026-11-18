import {
  ArrowRight,
  BellRing,
  CakeSlice,
  Camera,
  Check,
  CircleCheck,
  Coffee,
  CreditCard,
  CupSoda,
  Hotel,
  Languages,
  MessageCircle,
  Palette,
  Pizza,
  Play,
  QrCode,
  Quote,
  Sandwich,
  Sparkles,
  Star,
  Sun,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { env } from '@/lib/env';
import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money/format';
import { qrSvg } from '@/lib/qr/qr-svg';
import { cn } from '@/lib/utils';
import { publicPlans } from '../server/plans';
import { marketingHref } from '../services/paths';
import { planCards } from '../services/pricing';
import { TESTIMONIALS } from '../services/testimonials';
import { DemoPhone } from './demo-phone';
import { DemosSection } from './demos-section';
import { HeroStats } from './hero-stats';
import { MockMenu } from './landing-visuals';
import { whatsappHref } from './marketing-shell';
import { PlanMatrix } from './plan-matrix';
import { ServicesBento } from './services-bento';
import { VariantShowcase } from './variant-showcase';

const MARQUEE = [
  { key: 'cafe', Icon: Coffee },
  { key: 'tea', Icon: CupSoda },
  { key: 'restaurant', Icon: UtensilsCrossed },
  { key: 'pastry', Icon: CakeSlice },
  { key: 'lounge', Icon: Wine },
  { key: 'fastfood', Icon: Sandwich },
  { key: 'hotel', Icon: Hotel },
  { key: 'beach', Icon: Sun },
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

const SOCIAL_PROOF = [
  { key: 'cafe', Icon: Coffee },
  { key: 'restaurant', Icon: UtensilsCrossed },
  { key: 'pastry', Icon: CakeSlice },
  { key: 'bar', Icon: Wine },
  { key: 'pizzeria', Icon: Pizza },
  { key: 'fastfood', Icon: Sandwich },
] as const;

const SUPPORT = ['menu', 'print', 'train', 'help'] as const;

const FAQ = ['onlyMenu', 'app', 'start', 'print', 'internet', 'change', 'staff', 'data'] as const;

/** Path of the demo venue's public menu, or null when no demo is configured. */
function demoMenuPath(): string | null {
  return env.DEMO_MENU_SLUG ? `/${env.DEMO_MENU_SLUG}` : null;
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  center = false,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex max-w-2xl reveal flex-col gap-3',
        center && 'mx-auto items-center text-center',
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-label text-brand-text uppercase">{eyebrow}</p>
      ) : null}
      <h2
        id={id}
        className="font-heading text-2xl font-title tracking-heading text-balance text-foreground sm:text-3xl lg:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-lg text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/** Primary call to action (sign-up) with a light sweep. */
function StartButton({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      href="/signup"
      prefetch={false}
      className={cn(
        buttonVariants({ size: 'lg' }),
        'group relative gap-2 overflow-hidden shadow-lg shadow-brand/25',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-0 w-1/2 animate-shine bg-linear-to-r from-transparent via-on-brand/25 to-transparent"
      />
      {label}
      <ArrowRight
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
      />
    </Link>
  );
}

function WhatsAppButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2', className)}
    >
      <MessageCircle aria-hidden="true" />
      {label}
    </a>
  );
}

/** Marketing home (P1-16): editorial + bento redesign. Hero → proof → outcomes → products. */
export async function Landing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const demo = demoMenuPath();
  const whatsapp = whatsappHref();
  const qrTarget = `${env.NEXT_PUBLIC_APP_URL}${demo ?? ''}`;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-clip">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -inset-1/4 animate-drift bg-aurora" />
          <div className="absolute inset-0 bg-grid-fade" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-gutter pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-28">
          <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-7">
            <p className="flex animate-pop-in items-center gap-2 rounded-full border border-border bg-card/80 py-1 ps-1.5 pe-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm">
              <span className="relative grid size-6 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand/50" />
                <Sparkles aria-hidden="true" className="relative size-3.5" />
              </span>
              {t('hero.eyebrow')}
            </p>
            <h1 className="animate-pop-in font-heading text-3xl font-title tracking-title text-balance text-foreground anim-delay-1 sm:text-4xl lg:text-5xl xl:text-display-sm">
              {t('hero.title')} <span className="text-gradient-brand">{t('hero.titleAccent')}</span>
            </h1>
            <p className="max-w-xl animate-pop-in text-lg text-pretty text-muted-foreground anim-delay-2">
              {t('hero.description')}
            </p>
            <div className="flex w-full animate-pop-in flex-col gap-3 anim-delay-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <StartButton label={t('hero.start')} />
              {whatsapp ? <WhatsAppButton href={whatsapp} label={t('hero.whatsapp')} /> : null}
              <a
                href="#demos"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'lg' }),
                  'group gap-2 text-brand-text',
                )}
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle transition group-hover:bg-brand group-hover:text-on-brand">
                  <Play aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
                </span>
                {t('hero.watchDemo')}
              </a>
            </div>
            <ul className="flex animate-pop-in flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground anim-delay-4">
              {(['app', 'commitment', 'languages'] as const).map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <CircleCheck aria-hidden="true" className="size-4 text-success" />
                  {t(`hero.trust.${key}`)}
                </li>
              ))}
            </ul>
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

          <div className="relative flex min-h-136 justify-center lg:col-span-5">
            <HeroCollage
              photos={[
                {
                  src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=480&auto=format&q=70',
                  alt: t('hero.collage.cafe'),
                  className:
                    '-start-6 top-4 h-44 w-36 -rotate-6 anim-delay-6 max-sm:hidden lg:-start-10',
                  float: 'float',
                },
                {
                  src: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=480&auto=format&q=70',
                  alt: t('hero.collage.pastry'),
                  className:
                    '-end-6 bottom-6 h-48 w-40 rotate-6 anim-delay-8 max-sm:hidden lg:-end-10',
                  float: 'float-slow',
                },
              ]}
            />
            <div className="relative z-10 animate-float-slow">
              <DemoPhone
                src={demo}
                title={t('hero.frame')}
                fallback={<MockMenu locale={locale} />}
              />
            </div>
            <HeroChip
              icon={<BellRing className="size-4" />}
              label={t('hero.chips.call')}
              live
              float="float"
              className="start-0 top-16 anim-delay-5 sm:-start-2"
            />
            <HeroChip
              icon={<CreditCard className="size-4" />}
              label={t('hero.chips.bill')}
              float="float-slow"
              className="end-0 bottom-24 anim-delay-7 sm:-end-2 lg:top-1/2 lg:bottom-auto"
            />
            <HeroChip
              icon={<Languages className="size-4" />}
              label={t('hero.chips.translated')}
              float="float"
              className="start-0 bottom-12 anim-delay-9 max-sm:hidden"
            />
            {demo ? (
              <DemoQr
                url={qrTarget}
                label={t('hero.qr')}
                scan={t('hero.scan')}
                demo={demo}
                demoLabel={t('hero.demo')}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Venue marquee */}
      <section aria-label={t('marquee.label')} className="border-y border-border bg-card py-6">
        <p className="mb-4 px-gutter text-center text-sm font-semibold text-muted-foreground">
          {t('marquee.label')}
        </p>
        <div dir="ltr" className="overflow-clip mask-fade-x">
          <div className="flex w-max animate-marquee gap-3">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1 ? true : undefined}
                className="flex shrink-0 gap-3"
              >
                {MARQUEE.map(({ key, Icon }) => (
                  <li
                    key={key}
                    dir="auto"
                    className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold whitespace-nowrap text-foreground"
                  >
                    <Icon aria-hidden="true" className="size-4 text-brand-text" />
                    {t(`marquee.items.${key}`)}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* Hero stats — four big outcomes right under the marquee. */}
      <HeroStats locale={locale} />

      {/* Live demos (A2): one card per installed demo venue, lazily loaded. */}
      <Suspense fallback={null}>
        <DemosSection locale={locale} />
      </Suspense>

      {/* Variant showcase: four hand-picked demos to prove template range. */}
      <VariantShowcase locale={locale} />

      {/* Services bento: one hero card + five small cells. */}
      <ServicesBento locale={locale} qrUrl={qrTarget} />

      {/* How it works — horizontal timeline on desktop, vertical on mobile. */}
      <section aria-labelledby="steps" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
        <SectionHeading id="steps" title={t('steps.title')} />
        <div className="relative mt-12">
          <span
            aria-hidden="true"
            className="absolute inset-x-12 top-6 hidden h-0.5 reveal-line rounded-full bg-brand/30 md:block"
          />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ key, Icon }, index) => (
              <li key={key} className="relative flex reveal flex-col gap-4">
                <span className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-lg font-semibold text-on-brand shadow-lg ring-4 shadow-brand/30 ring-background">
                    {index + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-9 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </span>
                <h3 className="text-xl font-semibold text-foreground">
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

      {/* Feature matrix. */}
      <Suspense fallback={null}>
        <PlanMatrix locale={locale} />
      </Suspense>

      {/* Plans */}
      <section aria-labelledby="offers" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-gutter py-16 sm:py-24">
          <SectionHeading
            id="offers"
            eyebrow={t('offers.eyebrow')}
            title={t('offers.title')}
            description={t('offers.description')}
            center
          />
          <Suspense fallback={<OfferSkeletons />}>
            <Offers locale={locale} />
          </Suspense>
          <p className="mt-8 text-center text-md text-pretty text-muted-foreground">
            {t('offers.soon')}{' '}
            <Link
              href={marketingHref(locale, '/pricing')}
              className="inline-flex min-h-target items-center gap-1 rounded-xs font-semibold text-brand-text underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('offers.cta')}
              <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </Link>
          </p>
        </div>
      </section>

      {/* Social proof strip: a thin honest row of venue-type chips. No fake company logos. */}
      <section
        aria-labelledby="social-proof"
        className="mx-auto max-w-6xl px-gutter py-14 sm:py-20"
      >
        <div className="flex reveal flex-col items-center gap-5 text-center">
          <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
            {t('socialProof.eyebrow')}
          </p>
          <h2
            id="social-proof"
            className="max-w-2xl font-heading text-xl font-title tracking-heading text-balance text-foreground sm:text-2xl"
          >
            {t('socialProof.title')}
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-muted-foreground">
            {SOCIAL_PROOF.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-2">
                <Icon aria-hidden="true" className="size-5 text-muted-foreground/70" />
                <span>{t(`socialProof.items.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials — upgraded cards: brand-colored start-border, stars row, initials avatar. */}
      {TESTIMONIALS.length > 0 ? (
        <section
          aria-labelledby="testimonials"
          className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24"
        >
          <SectionHeading
            id="testimonials"
            eyebrow={t('testimonials.eyebrow')}
            title={t('testimonials.title')}
          />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <li
                key={item.id}
                className="relative flex reveal flex-col gap-4 rounded-xl border border-s-4 border-border border-s-brand bg-card p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Quote aria-hidden="true" className="size-8 text-brand-text/80" />
                <ul aria-hidden="true" className="flex gap-0.5 text-brand-text">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i}>
                      <Star className="size-4 fill-current" />
                    </li>
                  ))}
                </ul>
                <blockquote
                  dir="auto"
                  className="text-md leading-relaxed text-pretty text-foreground"
                >
                  {'“'}
                  {item.quote[locale]}
                  {'”'}
                </blockquote>
                <div className="mt-auto flex items-center gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-subtle font-semibold text-brand-on-subtle"
                  >
                    {initialsOf(item.author)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-foreground" dir="auto">
                      {item.author}
                    </span>
                    <span className="text-pretty text-muted-foreground" dir="auto">
                      {item.role[locale]}
                      {item.city ? ` · ${item.city}` : ''}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Segments */}
      <section aria-labelledby="segments" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
        <SectionHeading id="segments" title={t('segments.title')} />
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {SEGMENTS.map(({ key, Icon }) => (
            <li
              key={key}
              className="relative isolate flex reveal flex-col gap-4 overflow-clip rounded-xl bg-brand-subtle p-6 text-brand-on-subtle sm:p-8"
            >
              <Icon
                aria-hidden="true"
                className="absolute -end-6 -bottom-6 -z-10 size-40 opacity-15"
              />
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-brand text-on-brand shadow-md"
              >
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <h3 className="font-heading text-xl font-title tracking-heading sm:text-2xl">
                {t(`segments.items.${key}.title`)}
              </h3>
              <p className="text-md text-pretty">{t(`segments.items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Support */}
      <section aria-labelledby="support" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
        <div className="relative isolate grid reveal gap-8 overflow-clip rounded-xl bg-brand-panel p-6 text-brand-on-panel sm:p-10 lg:grid-cols-2 lg:p-12">
          <div
            aria-hidden="true"
            className="absolute -end-24 -top-24 -z-10 size-96 rounded-full bg-brand-on-panel/8"
          />
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm font-semibold tracking-label uppercase opacity-90">
              {t('support.eyebrow')}
            </p>
            <h2
              id="support"
              className="font-heading text-2xl font-title tracking-heading text-balance sm:text-3xl"
            >
              {t('support.title')}
            </h2>
            <p className="text-lg text-pretty text-brand-on-panel/90">{t('support.description')}</p>
            {whatsapp ? (
              <WhatsAppButton
                href={whatsapp}
                label={t('support.cta')}
                className="mt-2 border-transparent"
              />
            ) : null}
          </div>
          <ul className="flex flex-col gap-3 self-center">
            {SUPPORT.map((key) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-md bg-brand-on-panel/10 px-4 py-3.5 text-md font-medium"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-on-panel text-brand-panel">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                {t(`support.items.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-gutter pb-16 sm:pb-24">
        <SectionHeading id="faq" title={t('faq.title')} center />
        <div className="mt-8 flex flex-col gap-3">
          {FAQ.map((key) => (
            <details
              key={key}
              className="group rounded-md border border-border bg-card transition-shadow open:shadow-md motion-reduce:transition-none"
            >
              <summary className="flex min-h-target-staff cursor-pointer list-none items-center justify-between gap-4 rounded-md px-5 py-3 text-md font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t(`faq.items.${key}.q`)}
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  <PlusIcon />
                </span>
              </summary>
              <p className="px-5 pb-5 text-md text-pretty text-muted-foreground">
                {t(`faq.items.${key}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call to action — bold panel on brand surface. */}
      <section className="mx-auto max-w-6xl px-gutter pb-20 sm:pb-28">
        <div className="relative isolate overflow-clip rounded-xl bg-brand-panel px-6 py-14 text-center text-brand-on-panel shadow-2xl shadow-brand/25 sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1/4 -z-10 animate-drift bg-aurora opacity-40"
          />
          <h2 className="mx-auto max-w-3xl font-heading text-3xl font-title tracking-title text-balance sm:text-4xl lg:text-5xl">
            {t('finalCta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-brand-on-panel/85">
            {t('finalCta.description')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <StartButton label={t('hero.start')} />
            {whatsapp ? <WhatsAppButton href={whatsapp} label={t('hero.whatsapp')} /> : null}
          </div>
        </div>
      </section>
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  );
}

function HeroChip({
  icon,
  label,
  live = false,
  float,
  className,
}: {
  icon: ReactNode;
  label: string;
  live?: boolean;
  float?: 'float' | 'float-slow';
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn('absolute z-10 animate-pop-in', className)}>
      <span
        className={cn(
          'flex items-center gap-2.5 rounded-full border border-border bg-card/95 py-2 ps-2 pe-4 text-sm font-semibold whitespace-nowrap text-foreground shadow-xl backdrop-blur-sm',
          float === 'float' && 'animate-float',
          float === 'float-slow' && 'animate-float-slow',
        )}
      >
        <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
          {live ? (
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand/60" />
          ) : null}
          <span className="relative">{icon}</span>
        </span>
        {label}
      </span>
    </div>
  );
}

/**
 * Two Unsplash photos stacked behind the phone to turn the hero into a premium collage.
 * Hidden on `max-sm` to avoid pushing past the viewport at 360 px.
 */
function HeroCollage({
  photos,
}: {
  photos: readonly {
    src: string;
    alt: string;
    className: string;
    float: 'float' | 'float-slow';
  }[];
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
      {photos.map((photo) => (
        <div
          key={photo.src}
          className={cn(
            'absolute animate-pop-in overflow-clip rounded-lg shadow-2xl ring-1 ring-border/60',
            photo.className,
          )}
        >
          <div
            className={cn(
              'relative size-full',
              photo.float === 'float' ? 'animate-float' : 'animate-float-slow',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash hotlink, external CDN (CSP allows it). */}
            <img
              src={photo.src}
              alt={photo.alt}
              className="size-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-scrim/40 via-scrim/10 to-transparent" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two-letter initials for avatar fallbacks; keeps diacritics and RTL text intact. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

/** Large screens: a QR code to open the demo on a real phone. */
function DemoQr({
  url,
  label,
  scan,
  demo,
  demoLabel,
}: {
  url: string;
  label: string;
  scan: string;
  demo: string;
  demoLabel: string;
}) {
  const qr = qrSvg(url);
  return (
    <div className="absolute -end-6 bottom-0 z-10 hidden w-40 animate-pop-in flex-col items-center gap-2 rounded-md border border-border bg-card p-3 text-center shadow-xl anim-delay-8 xl:flex">
      <svg
        viewBox={`0 0 ${String(qr.size)} ${String(qr.size)}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
        className="size-28 rounded-xs"
      >
        <rect width={qr.size} height={qr.size} className="fill-on-scrim" />
        <path d={qr.path} className="fill-scrim" />
      </svg>
      <p className="text-xs text-pretty text-muted-foreground">{scan}</p>
      <a
        href={demo}
        className="inline-flex min-h-target items-center rounded-xs text-xs font-semibold text-brand-text underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {demoLabel}
      </a>
    </div>
  );
}

function OfferSkeletons() {
  return (
    <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

/** The plans sold today (Menu QR, Basic), priced from the catalogue: streamed, cached. */
async function Offers({ locale }: { locale: Locale }) {
  await connection();
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const cards = planCards(await publicPlans()).filter((card) => card.available);
  const whatsapp = whatsappHref();

  const offer = (code: string) => {
    if (code === 'menu_qr') {
      return {
        tagline: t('offers.plans.menu_qr.tagline'),
        points: (['menu', 'qr', 'changes', 'languages'] as const).map((point) =>
          t(`offers.plans.menu_qr.points.${point}`),
        ),
      };
    }
    if (code === 'basic') {
      return {
        tagline: t('offers.plans.basic.tagline'),
        points: (['menu', 'call', 'bill', 'team'] as const).map((point) =>
          t(`offers.plans.basic.points.${point}`),
        ),
      };
    }
    return null;
  };

  return (
    <ul className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
      {cards.map((card) => {
        const copy = offer(card.code);
        if (!copy) return null;
        return (
          <li
            key={card.code}
            className={cn(
              'relative flex reveal flex-col gap-6 rounded-xl p-6 sm:p-8',
              card.recommended
                ? 'shadow-2xl shadow-brand/30 border-gradient'
                : 'border border-border bg-background',
            )}
          >
            {card.recommended ? (
              <span className="absolute start-6 -top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand shadow-md">
                {t('offers.recommended')}
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-semibold text-foreground">{card.name[locale]}</h3>
              <p className="text-md text-muted-foreground">{copy.tagline}</p>
            </div>
            <p className="font-heading text-2xl font-title tracking-title text-foreground tabular-nums sm:text-3xl">
              {card.priceOnce === null
                ? t('offers.from', { price: formatMoney(card.priceMonthly, locale) })
                : t('offers.once', { price: formatMoney(card.priceOnce, locale) })}
            </p>
            <ul className="flex flex-1 flex-col gap-3">
              {copy.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-md text-foreground">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-subtle text-success">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            {card.priceOnce !== null && whatsapp ? (
              <WhatsAppButton href={whatsapp} label={t('offers.order')} className="w-full" />
            ) : (
              <StartButton
                label={t('pricing.cta')}
                className={card.recommended ? 'w-full' : 'w-full shadow-none'}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
