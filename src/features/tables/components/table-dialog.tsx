'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';
import type { TableRow } from '../queries/tables';
import { numberTextSchema } from '../schemas/tables';
import { addTable, addTableRange, editTable } from '../server/actions';
import { numberRange, takenNumbers } from '../services/table-numbers';
import { useTablesAction } from './use-tables-action';

interface TableDialogProps {
  /** `null` adds tables. */
  table: TableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Numbers of live tables, to flag conflicts before saving. */
  existing: ReadonlySet<number>;
  suggested: number;
  zones: readonly { id: string; label: string }[];
}

const NO_ZONE = 'none';

/** Add one table, a range (1–30), or edit a table's number, name and zone. */
export function TableDialog({
  table,
  open,
  onOpenChange,
  existing,
  suggested,
  zones,
}: TableDialogProps) {
  const t = useTranslations('tables');
  const { pending, run } = useTablesAction();
  const [mode, setMode] = useState<'single' | 'range'>(table ? 'single' : 'range');
  const [number, setNumber] = useState(String(table?.number ?? suggested));
  const [from, setFrom] = useState(String(suggested));
  const [to, setTo] = useState(String(Math.min(suggested + 9, 999)));
  const [label, setLabel] = useState(table?.label ?? '');
  const [zone, setZone] = useState(table?.zoneId ?? NO_ZONE);
  const [submitted, setSubmitted] = useState(false);

  const parse = (value: string) => numberTextSchema.safeParse(value);
  const single = parse(number);
  const start = parse(from);
  const end = parse(to);
  const range = start.success && end.success ? numberRange(start.data, end.data) : null;
  const others = new Set([...existing].filter((value) => value !== table?.number));
  const wanted = mode === 'single' ? (single.success ? [single.data] : []) : (range ?? []);
  const taken = takenNumbers(wanted, others);

  const rangeError =
    !start.success || !end.success
      ? t('errors.numberInvalid')
      : end.data < start.data
        ? t('errors.rangeReversed')
        : range === null
          ? t('errors.rangeTooLarge')
          : undefined;
  const zoneId = zone === NO_ZONE ? null : zone;

  const submit = () => {
    setSubmitted(true);
    if (taken.length > 0) return;
    if (mode === 'single') {
      if (!single.success) return;
      const input = { number: single.data, label, zoneId };
      if (table) {
        run(
          () => editTable(table.id, input),
          () => {
            toast.success(t('toast.saved'));
            onOpenChange(false);
          },
        );
      } else {
        run(
          () => addTable(input),
          ({ ids }) => {
            toast.success(t('toast.created', { count: ids.length }));
            onOpenChange(false);
          },
        );
      }
      return;
    }
    if (!range || !start.success || !end.success) return;
    run(
      () => addTableRange({ from: start.data, to: end.data, zoneId }),
      ({ ids }) => {
        toast.success(t('toast.created', { count: ids.length }));
        onOpenChange(false);
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="overflow-y-auto max-h-sheet sm:max-w-md">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>
              {table ? t('form.editTitle', { number: table.number }) : t('form.addTitle')}
            </DialogTitle>
            <DialogDescription>{t('form.description')}</DialogDescription>
          </DialogHeader>

          {table ? null : (
            <div role="group" aria-label={t('form.mode')} className="flex rounded-sm bg-muted p-1">
              {(['range', 'single'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                  }}
                  className={cn(
                    'min-h-target flex-1 rounded-xs px-3 text-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    mode === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`form.${value}`)}
                </button>
              ))}
            </div>
          )}

          {mode === 'single' ? (
            <>
              <FormField
                label={t('form.number')}
                error={submitted && !single.success ? t('errors.numberInvalid') : undefined}
              >
                <Input
                  value={number}
                  onChange={(event) => {
                    setNumber(event.target.value);
                  }}
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="off"
                />
              </FormField>
              <FormField label={t('form.label')} hint={t('form.labelHint')}>
                <Input
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                  }}
                  maxLength={40}
                  dir="auto"
                />
              </FormField>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('form.from')}>
                  <Input
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                    }}
                    inputMode="numeric"
                    dir="ltr"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label={t('form.to')}>
                  <Input
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                    }}
                    inputMode="numeric"
                    dir="ltr"
                    autoComplete="off"
                    aria-invalid={rangeError ? true : undefined}
                  />
                </FormField>
              </div>
              <p
                aria-live="polite"
                className={cn(
                  'text-sm',
                  rangeError ? 'text-destructive-text' : 'text-muted-foreground',
                )}
              >
                {rangeError ??
                  t('form.summary', {
                    count: range?.length ?? 0,
                    from: range?.[0] ?? 0,
                    to: range?.at(-1) ?? 0,
                  })}
              </p>
            </div>
          )}

          {zones.length > 0 ? (
            <FormField label={t('form.zone')}>
              {(control) => (
                <Select
                  items={[
                    { value: NO_ZONE, label: t('form.noZone') },
                    ...zones.map((entry) => ({ value: entry.id, label: entry.label })),
                  ]}
                  value={zone}
                  onValueChange={(next) => {
                    if (typeof next === 'string') setZone(next);
                  }}
                >
                  <SelectTrigger className="w-full" {...control}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ZONE}>{t('form.noZone')}</SelectItem>
                    {zones.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          ) : null}

          {taken.length > 0 ? (
            <p role="alert" className="text-sm text-destructive-text">
              {t('form.taken', { numbers: taken.join(', ') })}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={pending || (mode === 'range' && rangeError !== undefined)}
              aria-busy={pending || undefined}
            >
              {table ? t('form.save') : t('form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
