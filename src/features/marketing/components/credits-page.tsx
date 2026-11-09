import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { DEMO_PHOTO_CREDITS } from '../services/photo-credits';

/** `/legal/credits`: authors and licences of the demo café photos (CC BY / CC BY-SA). */
export async function CreditsPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing.legal.pages.credits' });
  const link =
    'inline-flex min-h-target items-center gap-1.5 rounded-xs font-semibold text-brand-text underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-gutter py-12 sm:py-16">
      <header className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-title tracking-title text-balance sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-md leading-relaxed text-pretty text-muted-foreground">{t('intro')}</p>
      </header>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
        {DEMO_PHOTO_CREDITS.map((credit) => (
          <li key={credit.file} className="flex flex-col gap-1 p-4">
            <p className="font-semibold text-foreground" dir="auto">
              {credit.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('author')} <span dir="auto">{credit.author}</span>
            </p>
            <p className="flex flex-wrap gap-x-4 text-sm">
              <a href={credit.source} rel="noopener noreferrer" target="_blank" className={link}>
                {t('source')}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
              <a
                href={credit.licenceUrl}
                rel="noopener noreferrer"
                target="_blank"
                className={link}
              >
                <span dir="ltr">{credit.licence}</span>
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
