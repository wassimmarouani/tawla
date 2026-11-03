'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { showUndoToast } from '@/components/feedback/undo-toast';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
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
import type { EditorMedia } from '../queries/editor-menu';
import { productFormSchema, type ProductForm as ProductFormValues } from '../schemas/menu-editor';
import { toDraft } from '../schemas/i18n-text';
import { removeProducts, saveProduct, undoRemoveProducts } from '../server/actions';
import { LocalizedFields } from './localized-fields';
import { ImageField } from './image-field';
import { SwitchRow } from './switch-row';
import { useEditorAction } from './use-editor-action';

type ProductFormOutput = z.output<typeof productFormSchema>;

export interface ProductFormInitial {
  categoryId: string;
  name: ProductFormValues['name'];
  description: ProductFormValues['description'];
  /** Price as the manager reads it (`3,500`). */
  priceText: string;
  media: EditorMedia | null;
  isAvailable: boolean;
  isVisible: boolean;
}

interface ProductFormProps {
  productId: string | null;
  initial: ProductFormInitial;
  categories: readonly { id: string; label: string }[];
  locales: readonly Locale[];
  storageUrl: string;
}

/** Create or edit a product (spec 04): photo, text in every language, price, category, states. */
export function ProductForm({
  productId,
  initial,
  categories,
  locales,
  storageUrl,
}: ProductFormProps) {
  const t = useTranslations('menuEditor');
  const { fieldError } = useFormErrors();
  const router = useRouter();
  const { pending, run, perform } = useEditorAction();
  const [media, setMedia] = useState<EditorMedia | null>(initial.media);

  const form = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      categoryId: initial.categoryId,
      name: toDraft(initial.name),
      description: toDraft(initial.description),
      price: initial.priceText,
      mediaId: initial.media?.id ?? null,
      isAvailable: initial.isAvailable,
      isVisible: initial.isVisible,
    },
    mode: 'onTouched',
  });
  const { errors } = form.formState;
  const name = useWatch({ control: form.control, name: 'name' });
  const description = useWatch({ control: form.control, name: 'description' });

  const onSubmit = form.handleSubmit((values) => {
    run(
      () => saveProduct(productId, values),
      () => {
        toast.success(productId ? t('toast.saved') : t('toast.created'));
        router.push('/dashboard/menu');
      },
    );
  });

  const onDelete = () => {
    if (!productId) return;
    run(
      () => removeProducts({ ids: [productId] }),
      () => {
        showUndoToast({
          message: t('toast.deleted', { count: 1 }),
          undoLabel: t('toast.undo'),
          undoneMessage: t('toast.undone'),
          failedMessage: t('toast.failed'),
          onUndo: async () => (await perform(() => undoRemoveProducts({ ids: [productId] }))).ok,
        });
        router.push('/dashboard/menu');
      },
    );
  };

  const nameError = errors.name?.message ?? errors.name?.root?.message;

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex max-w-2xl flex-col gap-6"
    >
      <section className="flex flex-col gap-6 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6">
        <ImageField
          label={t('form.photo')}
          hint={t('form.photoHint')}
          storageUrl={storageUrl}
          media={media}
          onChange={(next) => {
            setMedia(next);
            form.setValue('mediaId', next?.id ?? null, { shouldDirty: true });
          }}
        />
        <LocalizedFields
          label={t('form.name')}
          error={fieldError(nameError)}
          locales={locales}
          values={toDraft(name)}
          register={(locale) => form.register(`name.${locale}`)}
          maxLength={120}
        />
        <LocalizedFields
          label={t('form.description')}
          hint={t('form.descriptionHint')}
          locales={locales}
          values={toDraft(description)}
          register={(locale) => form.register(`description.${locale}`)}
          multiline
          maxLength={500}
        />
      </section>

      <section className="grid gap-5 rounded-md border border-border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        <FormField
          label={t('form.price')}
          hint={t('form.priceHint')}
          error={fieldError(errors.price?.message)}
        >
          {(control) => (
            // Amounts read left to right in every language: the currency stays after the digits.
            <div dir="ltr" className="relative">
              <Input
                {...control}
                {...form.register('price')}
                inputMode="decimal"
                autoComplete="off"
                className="pe-12 text-end tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm font-semibold text-muted-foreground"
              >
                {t('form.currency')}
              </span>
            </div>
          )}
        </FormField>
        <FormField label={t('form.category')} error={fieldError(errors.categoryId?.message)}>
          {(control) => (
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={categories.map((category) => ({
                    value: category.id,
                    label: category.label,
                  }))}
                  value={field.value}
                  onValueChange={(next) => {
                    if (typeof next === 'string') field.onChange(next);
                  }}
                >
                  <SelectTrigger className="w-full" {...control}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <div className="flex flex-col gap-4 sm:col-span-2">
          <Controller
            control={form.control}
            name="isAvailable"
            render={({ field }) => (
              <SwitchRow
                label={t('form.available')}
                hint={t('form.availableHint')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="isVisible"
            render={({ field }) => (
              <SwitchRow
                label={t('form.visible')}
                hint={t('form.visibleHint')}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {productId ? (
          <Button
            type="button"
            variant="destructive-soft"
            disabled={pending}
            onClick={onDelete}
            className="sm:me-auto"
          >
            <Trash2 aria-hidden="true" />
            {t('form.delete')}
          </Button>
        ) : null}
        <Link
          href="/dashboard/menu"
          className={buttonVariants({ variant: 'outline', className: 'sm:ms-auto' })}
        >
          {t('form.cancel')}
        </Link>
        <SubmitButton pending={pending} pendingLabel={t('form.save')} className="sm:w-auto">
          {productId ? t('form.save') : t('form.create')}
        </SubmitButton>
      </div>
    </form>
  );
}
