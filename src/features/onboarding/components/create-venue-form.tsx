'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import { Input } from '@/components/ui/input';
import type { ActionError } from '@/lib/errors';
import { venueSchema, type Venue } from '../schemas/venue';
import { createVenueForCurrentUser } from '../server/actions';
import { VenueTypeSelect } from './venue-type-select';

/** Venue creation for a signed-in user without a restaurant (dashboard fallback). */
export function CreateVenueForm() {
  const t = useTranslations('onboarding');
  const tForms = useTranslations('common.forms');
  const locale = useLocale();
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionError | null>(null);

  const form = useForm<Venue>({
    resolver: zodResolver(venueSchema),
    defaultValues: { venueType: 'cafe' },
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createVenueForCurrentUser({ ...values, locale });
      if (!result.ok) setFormError(result.error);
    });
  });

  return (
    <form
      method="post"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {formError ? <FormAlert>{reasonText(formError)}</FormAlert> : null}
      <FormField label={t('venueName')} error={fieldError(errors.venueName?.message)}>
        <Input autoComplete="organization" {...form.register('venueName')} />
      </FormField>
      <FormField label={t('venueType')} error={fieldError(errors.venueType?.message)}>
        {(control) => (
          <Controller
            control={form.control}
            name="venueType"
            render={({ field }) => (
              <VenueTypeSelect
                {...control}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        )}
      </FormField>
      <SubmitButton pending={pending} pendingLabel={tForms('pending')} className="mt-1">
        {t('create.submit')}
      </SubmitButton>
    </form>
  );
}
