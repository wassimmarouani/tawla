import { BellRing, BookOpenText, Bot, Languages, LayoutDashboard, QrCode } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ComponentType, SVGProps } from 'react';
import type { Locale } from '@/i18n/locales';
import { ServiceVisual } from './landing-visuals';

/**
 * Services shown as a 6-cell bento: one hero card (the digital menu, with the real
 * illustration) spans 2x2 on `lg+`, and five smaller cards round out the row. Replaces the flat
 * 3-column icon grid: gives the eye a clear focal point and reads like a product, not a list.
 */

const SMALL: readonly {
  key: 'qr' | 'service' | 'languages' | 'ai' | 'team';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: 'qr', Icon: QrCode },
  { key: 'service', Icon: BellRing },
  { key: 'languages', Icon: Languages },
  { key: 'ai', Icon: Bot },
  { key: 'team', Icon: LayoutDashboard },
];

export async function ServicesBento({ locale, qrUrl }: { locale: Locale; qrUrl: string }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });

  return (
    <section aria-labelledby="services" className="mx-auto max-w-6xl px-gutter pb-16 sm:pb-24">
      <div className="flex max-w-2xl reveal flex-col gap-3">
        <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
          {t('services.eyebrow')}
        </p>
        <h2
          id="services"
          className="font-heading text-2xl font-title tracking-heading text-balance text-foreground sm:text-3xl lg:text-4xl"
        >
          {t('services.title')}
        </h2>
        <p className="text-lg text-pretty text-muted-foreground">{t('services.description')}</p>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3">
        {/* Hero card — the digital menu, with its live illustration. */}
        <li className="group relative flex reveal flex-col gap-5 overflow-clip rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:col-span-2 lg:row-span-2 lg:p-8">
          <div className="flex-1">
            <ServiceVisual kind="menu" locale={locale} qrUrl={qrUrl} />
          </div>
          <div className="flex flex-col gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-sm bg-brand-subtle text-brand-on-subtle transition-colors group-hover:bg-brand group-hover:text-on-brand"
            >
              <BookOpenText aria-hidden="true" className="size-5" />
            </span>
            <h3 className="font-heading text-xl font-title tracking-heading text-foreground sm:text-2xl lg:text-3xl">
              {t('services.items.menu.title')}
            </h3>
            <p className="max-w-lg text-md text-pretty text-muted-foreground lg:text-lg">
              {t('services.items.menu.body')}
            </p>
          </div>
        </li>

        {/* Five small cells. */}
        {SMALL.map(({ key, Icon }) => (
          <li
            key={key}
            className="group flex reveal flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle transition-colors group-hover:bg-brand group-hover:text-on-brand"
            >
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {t(`services.items.${key}.title`)}
            </h3>
            <p className="text-md text-pretty text-muted-foreground">
              {t(`services.items.${key}.body`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
