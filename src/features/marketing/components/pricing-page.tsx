import { Check, Clock, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money/format';
import { cn } from '@/lib/utils';
import { publicPlans } from '../server/plans';
import { planCards, type PlanCard } from '../services/pricing';
import { whatsappHref } from './marketing-shell';

/** Pricing page (P1-16): the plan catalogue from the database, in dinars. */
export async function PricingPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' });
  return (
    <div className="mx-auto max-w-6xl px-gutter py-12 sm:py-16">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-heading text-3xl font-title tracking-title text-balance sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">{t('description')}</p>
      </div>
      <Suspense fallback={<PlanSkeletons />}>
        <PlanGrid locale={locale} />
      </Suspense>
      <p className="mt-8 flex items-start gap-2 text-md text-pretty text-muted-foreground">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t('soonNote')}
      </p>
    </div>
  );
}

function PlanSkeletons() {
  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-120 rounded-lg" />
      ))}
    </div>
  );
}

/** Streams at request time (cached for hours): the build never needs the database. */
async function PlanGrid({ locale }: { locale: Locale }) {
  await connection();
  const cards = planCards(await publicPlans());
  return (
    <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <li key={card.code} className="flex">
          <PlanCardView card={card} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

async function PlanCardView({ card, locale }: { card: PlanCard; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' });
  const whatsapp = whatsappHref();
  const name = card.name[locale];
  const titleId = `plan-${card.code}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'flex w-full flex-col gap-6 rounded-lg border bg-card p-6',
        card.recommended ? 'border-brand shadow-lg ring-1 ring-brand' : 'border-border',
      )}
    >
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={titleId} className="text-xl font-semibold text-foreground">
            {name}
          </h2>
          {card.recommended ? <Badge variant="success">{t('popular')}</Badge> : null}
        </div>
        {card.priceOnce === null ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-heading text-3xl font-title tracking-title text-foreground tabular-nums">
                {formatMoney(card.priceMonthly, locale)}
              </span>
              <span className="text-md text-muted-foreground">{t('perMonth')}</span>
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {t('perYear', { price: formatMoney(card.priceYearly, locale) })}
            </p>
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-heading text-3xl font-title tracking-title text-foreground tabular-nums">
                {formatMoney(card.priceOnce, locale)}
              </span>
              <span className="text-md text-muted-foreground">{t('once')}</span>
            </p>
            <p>
              <Badge variant="soft">{t('noSubscription')}</Badge>
            </p>
          </>
        )}
      </header>

      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>
          {card.limits.kind === 'unlimited'
            ? t('unlimited')
            : t('limits', {
                tables: card.limits.tables,
                staff: card.limits.staff,
                products: card.limits.products,
              })}
        </li>
        {card.priceOnce === null ? (
          <li>{t('ai', { imports: card.ai.imports, items: card.ai.items })}</li>
        ) : null}
      </ul>

      <div className="flex flex-1 flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">
          {card.extends ? t('everything', { plan: card.extends[locale] }) : t('included')}
        </p>
        <ul className="flex flex-col gap-2.5">
          {card.priceOnce === null
            ? null
            : (['printed', 'changes'] as const).map((extra) => (
                <li key={extra} className="flex items-start gap-2.5 text-md text-foreground">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="min-w-0 flex-1">{t(`extras.${extra}`)}</span>
                </li>
              ))}
          {card.features.map((feature) => (
            <li key={feature.key} className="flex items-start gap-2.5 text-md text-foreground">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              <span className="min-w-0 flex-1">{t(`features.${feature.key}`)}</span>
              {feature.live ? null : (
                <Badge variant="secondary" className="shrink-0">
                  {t('soon')}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      {card.priceOnce !== null && whatsapp ? (
        <a
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full gap-2')}
        >
          <MessageCircle aria-hidden="true" />
          {t('order')}
        </a>
      ) : card.available ? (
        <Link
          href="/signup"
          prefetch={false}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {t('cta')}
        </Link>
      ) : (
        <a
          href={whatsapp ?? '/signup'}
          {...(whatsapp ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
        >
          {t('contact')}
        </a>
      )}
    </article>
  );
}
