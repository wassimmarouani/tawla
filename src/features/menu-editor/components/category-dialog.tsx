'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/forms/form-field';
import { useFormErrors } from '@/components/forms/use-form-errors';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/locales';
import { WEEKDAYS, servingWindow, weekdayName, windowSchedule, type Weekday } from '@/lib/schedule';
import type { EditorCategory } from '../queries/editor-menu';
import { i18nTextSchema, toDraft } from '../schemas/i18n-text';
import { saveCategory } from '../server/actions';
import { LocalizedFields } from './localized-fields';
import { SwitchRow } from './switch-row';
import { useEditorAction } from './use-editor-action';

const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'required');

const categoryFormSchema = z
  .object({
    name: i18nTextSchema(80, true),
    isVisible: z.boolean(),
    timing: z.enum(['allDay', 'hours']),
    days: z.array(z.literal(WEEKDAYS)),
    from: clockSchema,
    to: clockSchema,
  })
  .refine((form) => form.timing === 'allDay' || form.days.length > 0, {
    message: 'noDays',
    path: ['days'],
  })
  .refine((form) => form.timing === 'allDay' || form.from !== form.to, {
    message: 'sameHours',
    path: ['to'],
  });
type CategoryForm = z.input<typeof categoryFormSchema>;
type CategoryFormOutput = z.output<typeof categoryFormSchema>;

const DIALOG_ERRORS = ['noDays', 'sameHours'] as const;

interface CategoryDialogProps {
  /** `null` creates a category. */
  category: EditorCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locales: readonly Locale[];
}

function defaults(category: EditorCategory | null): CategoryForm {
  const window = category?.availability ? servingWindow(category.availability) : null;
  return {
    name: toDraft(category?.name ?? {}),
    isVisible: category?.isVisible ?? true,
    timing: window ? 'hours' : 'allDay',
    days: window?.days ?? [...WEEKDAYS],
    from: window?.from ?? '07:00',
    to: window?.to ?? '11:00',
  };
}

/** Create or edit a category: name in every language, visibility, optional serving hours. */
export function CategoryDialog({ category, open, onOpenChange, locales }: CategoryDialogProps) {
  const t = useTranslations('menuEditor');
  const locale = useLocale();
  const { fieldError } = useFormErrors();
  const { pending, run } = useEditorAction();

  const form = useForm<CategoryForm, unknown, CategoryFormOutput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaults(category),
    mode: 'onTouched',
  });
  const { errors } = form.formState;
  const name = useWatch({ control: form.control, name: 'name' });
  const timing = useWatch({ control: form.control, name: 'timing' });

  const dialogError = (key: string | undefined) =>
    key && (DIALOG_ERRORS as readonly string[]).includes(key)
      ? t(`categoryDialog.${key as (typeof DIALOG_ERRORS)[number]}`)
      : fieldError(key);

  const onSubmit = form.handleSubmit((values) => {
    run(
      () =>
        saveCategory(category?.id ?? null, {
          name: values.name,
          isVisible: values.isVisible,
          availability:
            values.timing === 'hours'
              ? windowSchedule({ days: values.days, from: values.from, to: values.to })
              : null,
        }),
      () => {
        toast.success(category ? t('toast.categorySaved') : t('toast.categoryCreated'));
        onOpenChange(false);
      },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(defaults(category));
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="overflow-y-auto max-h-sheet sm:max-w-lg">
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
              {category ? t('categoryDialog.editTitle') : t('categoryDialog.createTitle')}
            </DialogTitle>
            <DialogDescription>{t('categoryDialog.description')}</DialogDescription>
          </DialogHeader>

          <LocalizedFields
            label={t('categoryDialog.name')}
            error={fieldError(errors.name?.message ?? errors.name?.root?.message)}
            locales={locales}
            values={toDraft(name)}
            register={(code) => form.register(`name.${code}`)}
            maxLength={80}
          />

          <Controller
            control={form.control}
            name="isVisible"
            render={({ field }) => (
              <SwitchRow
                label={t('categoryDialog.visible')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold text-foreground">
              {t('categoryDialog.availability')}
            </legend>
            <Controller
              control={form.control}
              name="timing"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(next) => {
                    if (next === 'allDay' || next === 'hours') field.onChange(next);
                  }}
                  className="flex flex-col gap-1"
                >
                  {(['allDay', 'hours'] as const).map((option) => (
                    <Label
                      key={option}
                      className="flex min-h-target cursor-pointer items-center gap-3 font-normal"
                    >
                      <RadioGroupItem value={option} />
                      {t(`categoryDialog.${option}`)}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />

            {timing === 'hours' ? (
              <div className="flex flex-col gap-4 rounded-md bg-muted p-4">
                <Controller
                  control={form.control}
                  name="days"
                  render={({ field }) => (
                    <div
                      role="group"
                      aria-label={t('categoryDialog.days')}
                      className="flex flex-col gap-2"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {t('categoryDialog.days')}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => {
                          const pressed = field.value.includes(day);
                          return (
                            <Button
                              key={day}
                              type="button"
                              size="sm"
                              variant={pressed ? 'default' : 'outline'}
                              aria-pressed={pressed}
                              className="min-w-12"
                              onClick={() => {
                                const next: Weekday[] = pressed
                                  ? field.value.filter((value) => value !== day)
                                  : [...field.value, day];
                                field.onChange(next);
                              }}
                            >
                              {weekdayName(day, locale)}
                            </Button>
                          );
                        })}
                      </div>
                      {errors.days ? (
                        <p className="text-sm text-destructive-text">
                          {dialogError(errors.days.message ?? errors.days.root?.message)}
                        </p>
                      ) : null}
                    </div>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label={t('categoryDialog.from')}
                    error={dialogError(errors.from?.message)}
                  >
                    <Input type="time" step={300} dir="ltr" {...form.register('from')} />
                  </FormField>
                  <FormField label={t('categoryDialog.to')} error={dialogError(errors.to?.message)}>
                    <Input type="time" step={300} dir="ltr" {...form.register('to')} />
                  </FormField>
                </div>
              </div>
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
              {t('categoryDialog.cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {category ? t('categoryDialog.save') : t('categoryDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
