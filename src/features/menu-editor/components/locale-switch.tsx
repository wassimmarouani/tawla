'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/locales';
import { cn } from '@/lib/utils';

interface LocaleSwitchProps {
  label: string;
  locales: readonly Locale[];
  value: Locale;
  onChange: (locale: Locale) => void;
  /** Locales with at least one empty text, marked with a dot. */
  missing: ReadonlySet<Locale>;
}

/**
 * Editing language of a form with many texts (option groups): every text field shows this
 * language, so a whole group is translated in one pass.
 */
export function LocaleSwitch({ label, locales, value, onChange, missing }: LocaleSwitchProps) {
  const t = useTranslations('menuEditor.form');
  const tLanguages = useTranslations('common.languages');
  if (locales.length < 2) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="inline-flex w-full rounded-sm bg-muted p-1 sm:w-fit">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            aria-pressed={locale === value}
            onClick={() => {
              onChange(locale);
            }}
            className={cn(
              'inline-flex min-h-target flex-1 items-center justify-center gap-2 rounded-xs px-3 text-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 pointer-coarse:min-h-target',
              locale === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span lang={locale}>{tLanguages(locale)}</span>
            {missing.has(locale) ? (
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
                <span className="sr-only">({t('missingTranslation')})</span>
              </>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
