'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Input } from '@/components/ui/input';
import type { ActionError } from '@/lib/errors';
import { passwordResetRequestSchema, type PasswordResetRequest } from '../schemas/auth';
import { requestPasswordReset } from '../server/actions';

export function ResetRequestForm() {
  const t = useTranslations('auth');
  const tForms = useTranslations('common.forms');
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<PasswordResetRequest>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: 'onTouched',
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) setSentTo(values.email);
      else setFormError(result.error);
    });
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-8" role="status">
        <AuthHeading
          icon={<MailCheck />}
          title={t('reset.sentTitle')}
          description={t.rich('reset.sentDescription', {
            email: sentTo,
            b: (chunks) => (
              <strong dir="ltr" className="font-semibold break-all text-foreground">
                {chunks}
              </strong>
            ),
          })}
        />
        <BackToLogin label={t('reset.back')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeading title={t('reset.title')} description={t('reset.description')} />
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
          label={t('fields.email')}
          error={fieldError(form.formState.errors.email?.message)}
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            {...form.register('email')}
          />
        </FormField>
        <SubmitButton pending={pending} pendingLabel={tForms('pending')}>
          {t('reset.submit')}
        </SubmitButton>
        <BackToLogin label={t('reset.back')} />
      </form>
    </div>
  );
}

function BackToLogin({ label }: { label: string }) {
  return (
    <Link
      href="/login"
      className="self-center text-sm font-semibold text-brand-text underline-offset-4 hover:underline pointer-coarse:py-3"
    >
      {label}
    </Link>
  );
}
