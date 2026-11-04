'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ActionError, ActionResult } from '@/lib/errors';
import { logInSchema, type LogIn } from '../schemas/auth';
import { logIn, resendConfirmation } from '../server/actions';

/**
 * Email + password sign-in. `action` replaces the back-office login (the staff app signs in on a
 * paired device); `compact` hides the sign-up and password-reset links there.
 */
export function LoginForm({
  next,
  action,
  compact = false,
}: {
  next?: string | undefined;
  action?: ((values: LogIn) => Promise<ActionResult>) | undefined;
  compact?: boolean;
}) {
  const t = useTranslations('auth');
  const tForms = useTranslations('common.forms');
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionError | null>(null);
  const [resent, setResent] = useState(false);

  const form = useForm<LogIn>({
    resolver: zodResolver(logInSchema),
    // Text fields have no defaultValues: React Hook Form then keeps what was typed before
    // hydration on slow phones instead of resetting it.
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setResent(false);
    startTransition(async () => {
      const result = action ? await action(values) : await logIn(values, next);
      if (result.ok) return;
      const fields = result.error.details?.fields;
      if (fields) {
        for (const [name, key] of Object.entries(fields)) {
          if (name === 'email' || name === 'password') form.setError(name, { message: key });
        }
      } else {
        setFormError(result.error);
      }
    });
  });

  const resend = () => {
    startTransition(async () => {
      const result = await resendConfirmation(form.getValues('email'));
      if (result.ok) setResent(true);
      else setFormError(result.error);
    });
  };

  return (
    <form
      method="post"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {formError ? (
        <FormAlert
          action={
            formError.details?.reason === 'emailNotConfirmed' && !resent ? (
              <Button
                type="button"
                variant="link"
                className="self-start text-destructive-text"
                onClick={resend}
                disabled={pending}
              >
                {t('login.resend')}
              </Button>
            ) : null
          }
        >
          {reasonText(formError)}
        </FormAlert>
      ) : null}
      {resent ? <FormAlert tone="success">{t('login.resent')}</FormAlert> : null}

      <FormField label={t('fields.email')} error={fieldError(errors.email?.message)}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          {...form.register('email')}
        />
      </FormField>

      <FormField
        label={t('fields.password')}
        error={fieldError(errors.password?.message)}
        labelAside={
          compact ? undefined : (
            <Link
              href="/reset"
              className="text-sm font-medium text-brand-text underline-offset-4 hover:underline pointer-coarse:py-3"
            >
              {t('login.forgot')}
            </Link>
          )
        }
      >
        <PasswordInput
          autoComplete="current-password"
          showLabel={t('fields.showPassword')}
          hideLabel={t('fields.hidePassword')}
          {...form.register('password')}
        />
      </FormField>

      <SubmitButton pending={pending} pendingLabel={tForms('pending')} className="mt-1">
        {t('login.submit')}
      </SubmitButton>

      {compact ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-text underline-offset-4 hover:underline"
          >
            {t('login.signUp')}
          </Link>
        </p>
      )}
    </form>
  );
}
