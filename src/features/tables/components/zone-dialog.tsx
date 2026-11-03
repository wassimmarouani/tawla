'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Zone } from '../queries/tables';
import { saveZone } from '../server/actions';
import { useTablesAction } from './use-tables-action';

interface ZoneDialogProps {
  zone: Zone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locales: readonly Locale[];
}

/** Create or rename a zone, one short name per menu language. */
export function ZoneDialog({ zone, open, onOpenChange, locales }: ZoneDialogProps) {
  const t = useTranslations('tables.zones');
  const tToast = useTranslations('tables.toast');
  const tLanguages = useTranslations('common.languages');
  const tForms = useTranslations('common.forms.errors');
  const { pending, run } = useTablesAction();
  const [name, setName] = useState<Record<Locale, string>>({
    fr: zone?.name.fr ?? '',
    ar: zone?.name.ar ?? '',
    en: zone?.name.en ?? '',
  });
  const [submitted, setSubmitted] = useState(false);
  const empty = locales.every((locale) => !name[locale].trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (empty) return;
            run(
              () => saveZone(zone?.id ?? null, { name }),
              () => {
                toast.success(tToast('zoneSaved'));
                onOpenChange(false);
              },
            );
          }}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>{zone ? t('editTitle') : t('createTitle')}</DialogTitle>
          </DialogHeader>
          {locales.map((locale, index) => (
            <FormField
              key={locale}
              label={`${t('name')} (${tLanguages(locale)})`}
              error={submitted && empty && index === 0 ? tForms('required') : undefined}
            >
              <Input
                value={name[locale]}
                onChange={(event) => {
                  setName((current) => ({ ...current, [locale]: event.target.value }));
                }}
                lang={locale}
                dir="auto"
                maxLength={60}
              />
            </FormField>
          ))}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
