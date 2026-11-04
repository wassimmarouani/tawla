import { TriangleAlert } from 'lucide-react';
import { getMessages, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import type { Locale } from '@/i18n/locales';

const sectionsSchema = z.record(
  z.string(),
  z.object({ title: z.string().min(1), body: z.string().min(1) }),
);

/** Legal placeholders (P1-16), sections in display order; texts await legal review. */
export const LEGAL_PAGES = {
  notice: ['publisher', 'hosting', 'ip'],
  terms: ['purpose', 'account', 'content', 'availability'],
  privacy: ['customers', 'venues', 'processors'],
} as const;

export type LegalPageKey = keyof typeof LEGAL_PAGES;

/** Date of the current drafts. */
const LEGAL_UPDATED = new Date('2026-11-04T12:00:00Z');

export function isLegalPage(value: string): value is LegalPageKey {
  return Object.hasOwn(LEGAL_PAGES, value);
}

export async function LegalPage({ locale, page }: { locale: Locale; page: LegalPageKey }) {
  const t = await getTranslations({ locale, namespace: 'marketing.legal' });
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Africa/Tunis',
  }).format(LEGAL_UPDATED);
  const messages = await getMessages({ locale });
  const texts = sectionsSchema.parse(messages.marketing.legal.pages[page].sections);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-gutter py-12 sm:py-16">
      <header className="flex flex-col gap-4">
        <p
          role="note"
          className="flex items-start gap-2.5 rounded-sm bg-warning-subtle px-4 py-3 text-sm font-semibold text-warning"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t('pending')}
        </p>
        <h1 className="font-heading text-3xl font-title tracking-title text-balance sm:text-4xl">
          {t(`pages.${page}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">{t('updated', { date })}</p>
      </header>
      {LEGAL_PAGES[page].map((key) => {
        const section = texts[key];
        if (!section) return null;
        return (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <p className="text-md leading-relaxed text-pretty text-muted-foreground">
              {section.body}
            </p>
          </section>
        );
      })}
    </article>
  );
}
