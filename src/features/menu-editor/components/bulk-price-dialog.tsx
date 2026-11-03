'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { showUndoToast } from '@/components/feedback/undo-toast';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/i18n/locales';
import { ROUNDING_STEPS, formatMoney, type RoundingStep } from '@/lib/money';
import { MAX_PRODUCT_PRICE } from '../schemas/menu-editor';
import { adjustPrices, restorePrices } from '../server/actions';
import { DEFAULT_ROUNDING_STEP, parsePercent, previewPriceChanges } from '../services/bulk-price';
import { useEditorAction } from './use-editor-action';

interface BulkPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly { id: string; name: string; price: number }[];
  locale: Locale;
  onApplied: () => void;
}

const MIN_BASIS_POINTS = -9_000;
const MAX_BASIS_POINTS = 20_000;

/**
 * Bulk percentage change (spec 04): the preview shows every new price, rounded to the chosen
 * step, before anything is saved; the result stays undoable.
 */
export function BulkPriceDialog({
  open,
  onOpenChange,
  items,
  locale,
  onApplied,
}: BulkPriceDialogProps) {
  const t = useTranslations('menuEditor');
  const { pending, run, perform } = useEditorAction();
  const [percent, setPercent] = useState('');
  const [step, setStep] = useState<RoundingStep>(DEFAULT_ROUNDING_STEP);
  const previewId = useId();

  const basisPoints = parsePercent(percent);
  const valid =
    basisPoints !== null &&
    basisPoints !== 0 &&
    basisPoints >= MIN_BASIS_POINTS &&
    basisPoints <= MAX_BASIS_POINTS;
  const preview = valid ? previewPriceChanges(items, basisPoints, step, MAX_PRODUCT_PRICE) : [];
  const changed = preview.filter((change) => change.after !== change.before).length;
  const names = new Map(items.map((item) => [item.id, item.name]));

  const apply = () => {
    if (!valid) return;
    run(
      () => adjustPrices({ ids: items.map((item) => item.id), basisPoints, step }),
      ({ changes }) => {
        onOpenChange(false);
        onApplied();
        if (changes.length === 0) return;
        showUndoToast({
          message: t('toast.pricesUpdated', { count: changes.length }),
          undoLabel: t('toast.undo'),
          undoneMessage: t('toast.undone'),
          failedMessage: t('toast.failed'),
          onUndo: async () =>
            (
              await perform(() =>
                restorePrices({
                  prices: changes.map((change) => ({ id: change.id, price: change.before })),
                }),
              )
            ).ok,
        });
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setPercent('');
          setStep(DEFAULT_ROUNDING_STEP);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="overflow-y-auto max-h-sheet sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('priceDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('priceDialog.description', { count: items.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t('priceDialog.percent')}
            hint={t('priceDialog.percentHint')}
            error={percent.trim() !== '' && !valid ? t('priceDialog.invalid') : undefined}
          >
            <Input
              value={percent}
              onChange={(event) => {
                setPercent(event.target.value);
              }}
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              aria-controls={previewId}
            />
          </FormField>
          <FormField label={t('priceDialog.rounding')}>
            {(control) => (
              <Select
                items={ROUNDING_STEPS.map((value) => ({
                  value: String(value),
                  label: formatMoney(value, locale),
                }))}
                value={String(step)}
                onValueChange={(next) => {
                  const value = ROUNDING_STEPS.find((candidate) => String(candidate) === next);
                  if (value) setStep(value);
                }}
              >
                <SelectTrigger className="w-full" {...control}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUNDING_STEPS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {formatMoney(value, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>

        <section
          id={previewId}
          aria-live="polite"
          aria-label={t('priceDialog.preview')}
          className="flex flex-col gap-2"
        >
          <h3 className="text-sm font-semibold text-foreground">{t('priceDialog.preview')}</h3>
          {valid ? (
            changed === 0 ? (
              <p className="text-sm text-muted-foreground">{t('priceDialog.unchanged')}</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">
                        {t('priceDialog.product')}
                      </th>
                      <th scope="col" className="px-3 py-2 text-end font-semibold">
                        {t('priceDialog.before')}
                      </th>
                      <th scope="col" className="px-3 py-2 text-end font-semibold">
                        {t('priceDialog.after')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((change) => (
                      <tr key={change.id}>
                        <td className="px-3 py-2 break-words text-foreground">
                          {names.get(change.id)}
                        </td>
                        <td className="px-3 py-2 text-end whitespace-nowrap text-muted-foreground tabular-nums">
                          {formatMoney(change.before, locale)}
                        </td>
                        <td className="px-3 py-2 text-end font-semibold whitespace-nowrap text-foreground tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3.5 text-muted-foreground rtl:-scale-x-100"
                            />
                            {formatMoney(change.after, locale)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t('priceDialog.percentHint')}</p>
          )}
        </section>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('priceDialog.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!valid || changed === 0 || pending}
            aria-busy={pending || undefined}
            onClick={apply}
          >
            {t('priceDialog.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
