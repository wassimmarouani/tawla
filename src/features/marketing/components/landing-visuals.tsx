import {
  BellRing,
  Check,
  CreditCard,
  Image as ImageIcon,
  Languages,
  ReceiptText,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LOCALES, type Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money/format';
import { qrSvg } from '@/lib/qr/qr-svg';
import { cn } from '@/lib/utils';

/**
 * Decorative product illustrations of the marketing home (aria-hidden): drawn with tokens and
 * real copy, never screenshots, so they stay sharp, themed and translated.
 */

const MOCK_ITEMS = [
  { key: 'espresso', price: 2500 },
  { key: 'capucin', price: 3200 },
  { key: 'citronnade', price: 4500 },
] as const;

/** Phones below 1024 px: a drawn menu instead of the live iframe. */
export async function MockMenu({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  return (
    <div aria-hidden="true" className="flex size-full flex-col bg-background text-start">
      <div className="bg-brand-subtle bg-dots px-4 pt-8 pb-4 text-brand-on-subtle">
        <p className="text-lg font-semibold">{t('mock.venue')}</p>
        <p className="text-xs opacity-80">{t('mock.tagline')}</p>
      </div>
      <div className="flex gap-1.5 px-3 py-3">
        {(['hot', 'cold', 'sweet'] as const).map((key, index) => (
          <span
            key={key}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              index === 0 ? 'bg-brand text-on-brand' : 'bg-muted text-muted-foreground',
            )}
          >
            {t(`mock.categories.${key}`)}
          </span>
        ))}
      </div>
      <ul className="flex flex-1 flex-col gap-2 px-3">
        {MOCK_ITEMS.map(({ key, price }) => (
          <li
            key={key}
            className="flex items-center gap-3 rounded-sm border border-border bg-card p-2.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xs bg-brand-subtle text-brand-on-subtle">
              <ImageIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
              {t(`mock.items.${key}`)}
            </span>
            <span className="text-sm font-semibold text-brand-text tabular-nums">
              {formatMoney(price, locale)}
            </span>
          </li>
        ))}
      </ul>
      <div className="m-3 flex gap-2">
        <span className="flex-1 rounded-sm bg-brand py-2.5 text-center text-xs font-semibold text-on-brand">
          {t('services.visual.call')}
        </span>
        <span className="flex-1 rounded-sm border border-border bg-card py-2.5 text-center text-xs font-semibold text-foreground">
          {t('services.visual.bill')}
        </span>
      </div>
    </div>
  );
}

const visualFrame =
  'relative flex h-40 items-center justify-center overflow-hidden rounded-md bg-muted/70 p-4';

/** One illustration per service card. */
export async function ServiceVisual({
  kind,
  locale,
  qrUrl,
}: {
  kind: 'menu' | 'qr' | 'service' | 'languages' | 'ai' | 'team';
  locale: Locale;
  qrUrl: string;
}) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const languages = await getTranslations({ locale, namespace: 'common.languages' });

  switch (kind) {
    case 'menu':
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="flex w-full max-w-64 flex-col gap-2">
            {MOCK_ITEMS.slice(0, 2).map(({ key, price }, index) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-sm bg-card px-3 py-2.5 shadow-sm"
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    index === 1 ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  {t(`mock.items.${key}`)}
                </span>
                {index === 1 ? (
                  <span className="rounded-full bg-destructive-subtle px-2 py-0.5 text-2xs font-semibold text-destructive-text">
                    {t('services.visual.soldOut')}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-brand-text tabular-nums">
                    {formatMoney(price, locale)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case 'qr': {
      const qr = qrSvg(qrUrl);
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="flex animate-float flex-col items-center gap-2 rounded-sm bg-card px-5 py-3 shadow-lg">
            <span className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
              {t('services.visual.table', { number: 5 })}
            </span>
            <svg
              viewBox={`0 0 ${String(qr.size)} ${String(qr.size)}`}
              shapeRendering="crispEdges"
              className="size-20"
            >
              <rect width={qr.size} height={qr.size} className="fill-on-scrim" />
              <path d={qr.path} className="fill-scrim" />
            </svg>
          </div>
        </div>
      );
    }
    case 'service':
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="flex w-full max-w-64 flex-col gap-2">
            <Notice
              icon={<BellRing className="size-4" />}
              title={t('services.visual.call')}
              meta={`${t('services.visual.table', { number: 4 })} · ${t('services.visual.now')}`}
              live
            />
            <Notice
              icon={<CreditCard className="size-4" />}
              title={`${t('services.visual.bill')} · ${t('services.visual.card')}`}
              meta={t('services.visual.table', { number: 7 })}
              className="ms-6 opacity-80"
            />
          </div>
        </div>
      );
    case 'languages':
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1 rounded-full bg-card p-1 shadow-sm">
              {LOCALES.map((value) => (
                <span
                  key={value}
                  lang={value}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    value === locale ? 'bg-brand text-on-brand' : 'text-muted-foreground',
                  )}
                >
                  {languages(value)}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-sm bg-card px-3 py-2 shadow-sm">
              <Languages className="size-4 text-brand-text" />
              <span className="text-sm font-semibold text-foreground">
                {t('mock.items.citronnade')}
              </span>
            </div>
          </div>
        </div>
      );
    case 'ai':
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="relative h-28 w-24 overflow-hidden rounded-xs bg-card p-2.5 shadow-md">
            {['w-14', 'w-10', 'w-16', 'w-12', 'w-14'].map((width, index) => (
              <span
                key={index}
                className={cn('mb-2 block h-1.5 rounded-full bg-muted-foreground/30', width)}
              />
            ))}
            <span className="absolute inset-x-0 top-0 h-6 animate-scan bg-brand/25" />
          </div>
          <span className="absolute end-4 bottom-4 flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-2xs font-semibold text-success">
            <Check className="size-3.5" />
            {t('services.visual.found', { count: 24 })}
          </span>
        </div>
      );
    case 'team':
      return (
        <div aria-hidden="true" className={visualFrame}>
          <div className="flex w-full max-w-64 flex-col gap-2">
            {MOCK_ITEMS.slice(0, 2).map(({ key }, index) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-sm bg-card px-3 py-2.5 shadow-sm"
              >
                <span className="text-sm font-semibold text-foreground">
                  {t(`mock.items.${key}`)}
                </span>
                <span
                  className={cn(
                    'flex h-5 w-9 items-center rounded-full p-0.5',
                    index === 0 ? 'justify-end bg-success' : 'bg-input',
                  )}
                >
                  <span className="size-4 rounded-full bg-card shadow-sm" />
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 px-1 text-2xs font-semibold text-muted-foreground">
              <ReceiptText className="size-3.5" />
              {t('services.visual.table', { number: 2 })} · {t('services.visual.bill')} ·{' '}
              {t('services.visual.cash')}
            </div>
          </div>
        </div>
      );
  }
}

function Notice({
  icon,
  title,
  meta,
  live = false,
  className,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-sm bg-card px-3 py-2.5 shadow-md', className)}
    >
      <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
        {live ? (
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand/60" />
        ) : null}
        <span className="relative">{icon}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-2xs text-muted-foreground">{meta}</span>
      </span>
    </div>
  );
}
