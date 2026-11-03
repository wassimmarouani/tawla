'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/i18n/locales';
import { cn } from '@/lib/utils';
import type { I18nDraft } from '../schemas/i18n-text';

interface LocalizedFieldsProps {
  label: string;
  hint?: string | undefined;
  /** Translated error of the whole field (e.g. "required"). */
  error?: string | undefined;
  /** Enabled menu languages, default first. */
  locales: readonly Locale[];
  values: I18nDraft;
  register: (locale: Locale) => UseFormRegisterReturn;
  multiline?: boolean;
  maxLength: number;
}

/**
 * One text in every menu language (ADR-0026): a tab per language, with a dot on languages still
 * empty so missing translations stay visible. Inputs stay mounted, so switching never loses text.
 */
export function LocalizedFields({
  label,
  hint,
  error,
  locales,
  values,
  register,
  multiline = false,
  maxLength,
}: LocalizedFieldsProps) {
  const t = useTranslations('menuEditor.form');
  const tLanguages = useTranslations('common.languages');
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const first = locales[0] ?? 'fr';

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold text-foreground">{label}</legend>
      <Tabs defaultValue={first}>
        {locales.length > 1 ? (
          <TabsList aria-label={t('languages')} className="w-full sm:w-fit">
            {locales.map((locale) => {
              const missing = !values[locale].trim();
              return (
                <TabsTrigger key={locale} value={locale} className="min-h-target sm:min-h-0">
                  <span lang={locale}>{tLanguages(locale)}</span>
                  {missing ? (
                    <>
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
                      <span className="sr-only">({t('missingTranslation')})</span>
                    </>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        ) : null}
        {locales.map((locale) => {
          const field = register(locale);
          const common = {
            ...field,
            lang: locale,
            dir: 'auto' as const,
            maxLength,
            'aria-label': `${label} (${tLanguages(locale)})`,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': message ? messageId : undefined,
          };
          return (
            <TabsContent key={locale} value={locale} keepMounted>
              {multiline ? <Textarea rows={3} {...common} /> : <Input {...common} />}
            </TabsContent>
          );
        })}
      </Tabs>
      {message ? (
        <p
          id={messageId}
          className={cn('text-sm', error ? 'text-destructive-text' : 'text-muted-foreground')}
        >
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
