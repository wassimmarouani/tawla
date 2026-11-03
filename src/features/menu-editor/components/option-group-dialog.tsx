'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/i18n/locales';
import { millimesToDecimal } from '@/lib/money';
import type { EditorOptionGroup } from '../queries/editor-menu';
import { toDraft } from '../schemas/i18n-text';
import {
  MAX_OPTIONS_PER_GROUP,
  optionGroupFormSchema,
  type OptionGroupForm,
} from '../schemas/options';
import { saveOptionGroup } from '../server/actions';
import { LocaleSwitch } from './locale-switch';
import { useEditorAction } from './use-editor-action';
import { useFieldError } from './use-field-error';

type OptionGroupOutput = z.output<typeof optionGroupFormSchema>;

interface OptionGroupDialogProps {
  /** `null` creates a group. */
  group: EditorOptionGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locales: readonly Locale[];
}

function defaults(group: EditorOptionGroup | null): OptionGroupForm {
  return {
    name: toDraft(group?.name ?? {}),
    minSelect: String(group?.minSelect ?? 0),
    maxSelect: String(group?.maxSelect ?? 1),
    options: group
      ? group.options.map((option) => ({
          id: option.id,
          name: toDraft(option.name),
          priceDelta: option.priceDelta === 0 ? '' : millimesToDecimal(option.priceDelta),
          isAvailable: option.isAvailable,
        }))
      : [
          { id: null, name: toDraft({}), priceDelta: '', isAvailable: true },
          { id: null, name: toDraft({}), priceDelta: '', isAvailable: true },
        ],
  };
}

/** Create or edit a reusable option group (ADR-0014): name, min/max, options and prices. */
export function OptionGroupDialog({ group, open, onOpenChange, locales }: OptionGroupDialogProps) {
  const t = useTranslations('menuEditor');
  const fieldError = useFieldError();
  const { pending, run } = useEditorAction();
  const [locale, setLocale] = useState<Locale>(locales[0] ?? 'fr');

  const form = useForm<OptionGroupForm, unknown, OptionGroupOutput>({
    resolver: zodResolver(optionGroupFormSchema),
    defaultValues: defaults(group),
    mode: 'onTouched',
  });
  const { errors } = form.formState;
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'options',
  });
  const name = useWatch({ control: form.control, name: 'name' });
  const optionValues = useWatch({ control: form.control, name: 'options' });
  const missing = new Set(
    locales.filter(
      (code) => !name[code]?.trim() || optionValues.some((option) => !option.name[code]?.trim()),
    ),
  );

  const onSubmit = form.handleSubmit((values) => {
    run(
      () => saveOptionGroup(group?.id ?? null, values),
      () => {
        toast.success(group ? t('options.saved') : t('options.created'));
        onOpenChange(false);
      },
    );
  });

  const optionsError = errors.options?.message ?? errors.options?.root?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(defaults(group));
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="overflow-y-auto max-h-sheet sm:max-w-xl">
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>
              {group ? t('optionDialog.editTitle') : t('optionDialog.createTitle')}
            </DialogTitle>
            <DialogDescription>{t('optionDialog.description')}</DialogDescription>
          </DialogHeader>

          <LocaleSwitch
            label={t('optionDialog.language')}
            locales={locales}
            value={locale}
            onChange={setLocale}
            missing={missing}
          />

          <FormField
            label={t('optionDialog.name')}
            error={fieldError(errors.name?.message ?? errors.name?.root?.message)}
          >
            <Input
              key={`name-${locale}`}
              lang={locale}
              dir="auto"
              maxLength={80}
              {...form.register(`name.${locale}`)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={t('optionDialog.minSelect')}
              error={fieldError(errors.minSelect?.message)}
            >
              <Input inputMode="numeric" dir="ltr" {...form.register('minSelect')} />
            </FormField>
            <FormField
              label={t('optionDialog.maxSelect')}
              error={fieldError(errors.maxSelect?.message)}
            >
              <Input inputMode="numeric" dir="ltr" {...form.register('maxSelect')} />
            </FormField>
            <p className="col-span-2 text-sm text-muted-foreground">
              {t('optionDialog.rulesHint')}
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold text-foreground">
              {t('optionDialog.options')}
            </legend>
            <ol className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const position = index + 1;
                const optionErrors = errors.options?.[index];
                return (
                  <li
                    key={field.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        key={`option-${field.id}-${locale}`}
                        lang={locale}
                        dir="auto"
                        maxLength={80}
                        aria-label={t('optionDialog.optionName', { index: position })}
                        aria-invalid={optionErrors?.name ? true : undefined}
                        className="sm:flex-1"
                        {...form.register(`options.${index}.name.${locale}`)}
                      />
                      <div dir="ltr" className="relative sm:w-36">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground"
                        >
                          +
                        </span>
                        <Input
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="0"
                          aria-label={t('optionDialog.optionPrice', { index: position })}
                          aria-invalid={optionErrors?.priceDelta ? true : undefined}
                          className="ps-7 pe-11 text-end tabular-nums"
                          {...form.register(`options.${index}.priceDelta`)}
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm font-semibold text-muted-foreground"
                        >
                          {t('form.currency')}
                        </span>
                      </div>
                    </div>
                    {optionErrors?.name || optionErrors?.priceDelta ? (
                      <p className="text-sm text-destructive-text">
                        {fieldError(
                          optionErrors.name?.message ??
                            optionErrors.name?.root?.message ??
                            optionErrors.priceDelta?.message,
                        )}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <Controller
                        control={form.control}
                        name={`options.${index}.isAvailable`}
                        render={({ field: availability }) => (
                          <Switch
                            checked={availability.value}
                            onCheckedChange={availability.onChange}
                            aria-label={t('optionDialog.optionAvailable', { index: position })}
                          />
                        )}
                      />
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          aria-label={t('optionDialog.moveUp', { index: position })}
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
                          aria-label={t('optionDialog.moveDown', { index: position })}
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
                          disabled={fields.length === 1}
                          aria-label={t('optionDialog.remove', { index: position })}
                          className="text-destructive-text"
                          onClick={() => {
                            remove(index);
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {optionsError ? (
              <p className="text-sm text-destructive-text">{fieldError(optionsError)}</p>
            ) : null}
            {fields.length < MAX_OPTIONS_PER_GROUP ? (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => {
                  append({ id: null, name: toDraft({}), priceDelta: '', isAvailable: true });
                }}
              >
                <Plus aria-hidden="true" />
                {t('optionDialog.addOption')}
              </Button>
            ) : null}
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('optionDialog.cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {group ? t('optionDialog.save') : t('optionDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
