'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import type { ActionError } from '@/lib/errors';
import { passwordUpdateSchema, type PasswordUpdate } from '../schemas/auth';
import { updatePassword } from '../server/actions';

export function NewPasswordForm() {
  const t = useTranslations('auth');
  const tForms = useTranslations('common.forms');
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionError | null>(null);

  const form = useForm<PasswordUpdate>({
    resolver: zodResolver(passwordUpdateSchema),
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updatePassword(values);
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
      <FormField
        label={t('fields.newPassword')}
        hint={t('fields.passwordHint')}
        error={fieldError(errors.password?.message)}
      >
        <PasswordInput
          autoComplete="new-password"
          showLabel={t('fields.showPassword')}
          hideLabel={t('fields.hidePassword')}
          {...form.register('password')}
        />
      </FormField>
      <FormField
        label={t('fields.confirmPassword')}
        error={fieldError(errors.confirmPassword?.message)}
      >
        <PasswordInput
          autoComplete="new-password"
          showLabel={t('fields.showPassword')}
          hideLabel={t('fields.hidePassword')}
          {...form.register('confirmPassword')}
        />
      </FormField>
      <SubmitButton pending={pending} pendingLabel={tForms('pending')} className="mt-1">
        {t('reset.newSubmit')}
      </SubmitButton>
    </form>
  );
}
