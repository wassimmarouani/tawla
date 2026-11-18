import { Clock, Globe2, Smartphone, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ComponentType, SVGProps } from 'react';
import type { Locale } from '@/i18n/locales';

/**
 * Hero stats strip: four headline outcomes rendered as a dark-card bento row. Sits right under
 * the venue marquee so the prospect reads the promise (hero) → proof (marquee) → outcomes (here)
 * before anything else. Server component, no DB access, no client JS.
 */

const STATS: readonly {
  key: 'setup' | 'alert' | 'languages' | 'app';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: 'setup', Icon: Clock },
  { key: 'alert', Icon: Zap },
  { key: 'languages', Icon: Globe2 },
  { key: 'app', Icon: Smartphone },
];

export async function HeroStats({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });

  return (
    <section
      aria-labelledby="hero-stats"
      className="mx-auto max-w-6xl px-gutter py-16 sm:py-20 lg:py-24"
    >
      <div className="flex max-w-2xl reveal flex-col gap-3">
        <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
          {t('stats.eyebrow')}
        </p>
        <h2
          id="hero-stats"
          className="font-heading text-2xl font-title tracking-heading text-balance text-foreground sm:text-3xl lg:text-4xl"
        >
          {t('stats.title')}
        </h2>
        <p className="text-lg text-pretty text-muted-foreground">{t('stats.description')}</p>
      </div>

      <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ key, Icon }) => (
          <div
            key={key}
            className="group relative isolate flex reveal flex-col gap-4 overflow-clip rounded-lg bg-brand-panel p-6 text-brand-on-panel shadow-xl transition hover:-translate-y-1 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -end-14 -top-14 -z-10 size-40 rounded-full bg-brand-on-panel/10 blur-2xl"
            />
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-sm bg-brand-on-panel/15 text-brand-on-panel transition-colors group-hover:bg-brand-on-panel group-hover:text-brand-panel"
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <dd className="font-heading text-4xl font-title tracking-title tabular-nums sm:text-5xl">
              {t(`stats.items.${key}.value`)}
            </dd>
            <dt className="flex flex-col gap-1">
              <span className="text-base font-semibold text-balance">
                {t(`stats.items.${key}.label`)}
              </span>
              <span className="text-sm text-pretty text-brand-on-panel/75">
                {t(`stats.items.${key}.body`)}
              </span>
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
