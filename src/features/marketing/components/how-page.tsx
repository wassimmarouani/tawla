import { QrCode, Smartphone, Bell, Star, MessageCircle, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n/locales';
import { marketingHref } from '../services/paths';
import { whatsappHref } from './marketing-shell';

/**
 * `/how-it-works` (and its localized counterparts): six-step explainer of Taply for prospects
 * who have not understood the product from the home page. No images: inline icons and copy only,
 * so the page ships with no runtime data and renders statically.
 */
export async function HowItWorksPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.howItWorks' });
  const whatsapp = whatsappHref();
  const steps = [
    { icon: QrCode, key: 'scan' },
    { icon: Smartphone, key: 'browse' },
    { icon: Bell, key: 'call' },
    { icon: Zap, key: 'serve' },
    { icon: Star, key: 'rate' },
    { icon: MessageCircle, key: 'edit' },
  ] as const;
  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-gutter py-10 sm:py-14">
      <header className="flex flex-col items-center gap-4 text-center">
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

      <ol className="flex flex-col gap-4">
        {steps.map(({ icon: Icon, key }, index) => (
          <li
            key={key}
            className="flex gap-4 rounded-md border border-border bg-card p-5 sm:gap-6 sm:p-6"
          >
            <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-brand-subtle text-brand-on-subtle sm:size-14">
              <Icon aria-hidden="true" className="size-6 sm:size-7" />
              <span className="absolute -end-1 -top-1 grid size-6 place-items-center rounded-full bg-brand text-2xs font-semibold text-on-brand">
                {index + 1}
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {t(`steps.${key}.title`)}
              </h2>
              <p className="text-md leading-relaxed text-pretty text-muted-foreground">
                {t(`steps.${key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section
        aria-labelledby="how-cta"
        className="flex flex-col items-center gap-4 rounded-md bg-brand p-8 text-center text-on-brand sm:p-10"
      >
        <h2 id="how-cta" className="font-heading text-2xl font-title tracking-title text-balance">
          {t('cta.title')}
        </h2>
        <p className="max-w-xl text-pretty opacity-90">{t('cta.body')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={marketingHref(locale, '/pricing')}
            className="rounded-full bg-background px-6 py-3 text-md font-semibold text-foreground outline-none hover:bg-background/90 focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
          >
            {t('cta.pricing')}
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-background/60 px-6 py-3 text-md font-semibold outline-none hover:bg-background/10 focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {t('cta.whatsapp')}
            </a>
          ) : null}
        </div>
      </section>
    </article>
  );
}
