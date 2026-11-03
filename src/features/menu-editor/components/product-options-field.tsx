'use client';

import { ArrowDown, ArrowUp, ChevronDown, Settings2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useId, useState } from 'react';
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/i18n/locales';
import { formatMoney, millimesToDecimal, parseMoneyInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { EditorOptionGroup } from '../queries/editor-menu';
import type { ProductForm, ProductFormOutput } from '../schemas/menu-editor';
import { MAX_GROUPS_PER_PRODUCT } from '../schemas/options';
import { displayText } from '../services/menu-text';
import { effectiveRules, ruleSummary } from '../services/option-rules';
import { useFieldError } from './use-field-error';

interface ProductOptionsFieldProps {
  control: Control<ProductForm, unknown, ProductFormOutput>;
  register: UseFormRegister<ProductForm>;
  errors: FieldErrors<ProductForm>['optionLinks'];
  groups: readonly EditorOptionGroup[];
  locale: Locale;
  defaultLocale: Locale;
}

function count(text: string): number | null {
  return /^\d{1,2}$/.test(text.trim()) ? Number(text.trim()) : null;
}

/**
 * Option groups of a product (ADR-0014 §2): ordered links to reusable groups, each with
 * optional min/max and per-option price overrides for this product only.
 */
export function ProductOptionsField({
  control,
  register,
  errors,
  groups,
  locale,
  defaultLocale,
}: ProductOptionsFieldProps) {
  const t = useTranslations('menuEditor');
  const fieldError = useFieldError();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'optionLinks' });
  const links = useWatch({ control, name: 'optionLinks' });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const headingId = useId();
  const linked = new Set(links.map((link) => link.optionGroupId));
  const available = groups.filter((group) => !linked.has(group.id));
  const nameOf = (group: EditorOptionGroup) =>
    displayText(group.name, locale, defaultLocale) || t('product.untitled');

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-prose flex-col gap-1">
          <h2 id={headingId} className="text-sm font-semibold text-foreground">
            {t('productOptions.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('productOptions.hint')}</p>
        </div>
        <Link
          href="/dashboard/menu/options"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-brand-text' })}
        >
          <Settings2 aria-hidden="true" />
          {t('productOptions.manage')}
        </Link>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('productOptions.none')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const link = links[index];
            const group = groups.find((candidate) => candidate.id === field.optionGroupId);
            if (!group || !link) return null;
            const name = nameOf(group);
            const rules = effectiveRules(group, {
              minSelect: count(link.minSelect),
              maxSelect: count(link.maxSelect),
            });
            const rule = ruleSummary(rules.minSelect, Math.max(rules.maxSelect, rules.minSelect));
            const expanded = open.has(field.id);
            const linkErrors = errors?.[index];
            const panelId = `${field.id}-overrides`;
            return (
              <li key={field.id} className="rounded-md border border-border">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span dir="auto" className="font-semibold break-words text-foreground">
                      {name}
                    </span>
                    <span>
                      <Badge variant={rules.minSelect > 0 ? 'soft' : 'secondary'}>
                        {t(`options.${rule.key}`, rule.values)}
                      </Badge>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={t('productOptions.moveUp', { name })}
                      onClick={() => {
                        move(index, index - 1);
                      }}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === fields.length - 1}
                      aria-label={t('productOptions.moveDown', { name })}
                      onClick={() => {
                        move(index, index + 1);
                      }}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('productOptions.remove', { name })}
                      className="text-destructive-text"
                      onClick={() => {
                        remove(index);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-3 text-sm text-muted-foreground">
                  {group.options.map((option) => {
                    const override = parseMoneyInput(link.priceOverrides[option.id] ?? '');
                    const price = override ?? option.priceDelta;
                    return (
                      <li key={option.id}>
                        <span dir="auto">{displayText(option.name, locale, defaultLocale)}</span>{' '}
                        <span className="tabular-nums">
                          {price === 0
                            ? t('options.included')
                            : t('options.delta', { price: formatMoney(price, locale) })}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-border">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => {
                      setOpen((current) => {
                        const next = new Set(current);
                        if (expanded) next.delete(field.id);
                        else next.add(field.id);
                        return next;
                      });
                    }}
                    className="flex min-h-target w-full items-center justify-between gap-2 px-3 text-sm font-semibold text-brand-text outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    {t('productOptions.customize')}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                    />
                  </button>
                  <div id={panelId} hidden={!expanded} className="flex flex-col gap-4 p-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-semibold text-foreground">
                          {t('productOptions.minSelect')}
                        </span>
                        <Input
                          inputMode="numeric"
                          dir="ltr"
                          placeholder={String(group.minSelect)}
                          aria-invalid={linkErrors?.minSelect ? true : undefined}
                          {...register(`optionLinks.${index}.minSelect`)}
                        />
                        <span className="text-muted-foreground">
                          {t('productOptions.groupDefault', { value: group.minSelect })}
                        </span>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-semibold text-foreground">
                          {t('productOptions.maxSelect')}
                        </span>
                        <Input
                          inputMode="numeric"
                          dir="ltr"
                          placeholder={String(group.maxSelect)}
                          aria-invalid={linkErrors?.maxSelect ? true : undefined}
                          {...register(`optionLinks.${index}.maxSelect`)}
                        />
                        <span className="text-muted-foreground">
                          {t('productOptions.groupDefault', { value: group.maxSelect })}
                        </span>
                      </label>
                      {linkErrors?.minSelect || linkErrors?.maxSelect ? (
                        <p className="col-span-2 text-sm text-destructive-text">
                          {fieldError(
                            linkErrors.maxSelect?.message ?? linkErrors.minSelect?.message,
                          )}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.options.map((option) => {
                        const optionName = displayText(option.name, locale, defaultLocale);
                        return (
                          <label key={option.id} className="flex flex-col gap-1.5 text-sm">
                            <span dir="auto" className="font-semibold text-foreground">
                              {t('productOptions.priceFor', { name: optionName })}
                            </span>
                            <div dir="ltr" className="relative">
                              <Input
                                inputMode="decimal"
                                autoComplete="off"
                                placeholder={millimesToDecimal(option.priceDelta)}
                                className="pe-11 text-end tabular-nums"
                                {...register(`optionLinks.${index}.priceOverrides.${option.id}`)}
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm font-semibold text-muted-foreground"
                              >
                                {t('form.currency')}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('productOptions.noGroups')}</p>
      ) : available.length > 0 && fields.length < MAX_GROUPS_PER_PRODUCT ? (
        <Select
          items={available.map((group) => ({ value: group.id, label: nameOf(group) }))}
          value={null}
          onValueChange={(next) => {
            if (typeof next !== 'string') return;
            append({ optionGroupId: next, minSelect: '', maxSelect: '', priceOverrides: {} });
          }}
        >
          <SelectTrigger aria-label={t('productOptions.add')} className="w-full sm:w-72">
            <SelectValue placeholder={t('productOptions.add')} />
          </SelectTrigger>
          <SelectContent>
            {available.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {nameOf(group)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </section>
  );
}
