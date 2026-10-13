'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resendConfirmation } from '@/features/auth';
import { isLocale } from '@/i18n/locales';
import type { ActionError } from '@/lib/errors';
import { signUpSchema, type SignUp } from '../schemas/sign-up';
import { signUp } from '../server/actions';
import { VenueTypeSelect } from './venue-type-select';

const FIELDS = ['venueName', 'venueType', 'fullName', 'email', 'password'] as const;

export function SignUpForm() {
  const t = useTranslations('auth');
  const tVenue = useTranslations('onboarding');
  const tForms = useTranslations('common.forms');
  const locale = useLocale();
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { venueType: 'cafe', locale: isLocale(locale) ? locale : 'fr' },
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signUp(values);
      if (result.ok) {
        setSentTo(values.email);
        return;
      }
      let shown = false;
      for (const name of FIELDS) {
        const key = result.error.details?.fields?.[name];
        if (key) {
          form.setError(name, { message: key });
          shown = true;
        }
      }
      if (!shown) setFormError(result.error);
    });
  });

  if (sentTo) return <SentState email={sentTo} />;

  return (
    <div className="flex flex-col gap-8">
      <AuthHeading title={t('signup.title')} description={t('signup.description')} />
      <form
        method="post"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        noValidate
        className="flex flex-col gap-6"
      >
        {formError ? <FormAlert>{reasonText(formError)}</FormAlert> : null}

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-xs font-semibold tracking-label text-muted-foreground uppercase">
            {t('signup.venueSection')}
          </legend>
          <FormField label={tVenue('venueName')} error={fieldError(errors.venueName?.message)}>
            <Input autoComplete="organization" {...form.register('venueName')} />
          </FormField>
          <FormField label={tVenue('venueType')} error={fieldError(errors.venueType?.message)}>
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
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-xs font-semibold tracking-label text-muted-foreground uppercase">
            {t('signup.accountSection')}
          </legend>
          <FormField label={t('fields.fullName')} error={fieldError(errors.fullName?.message)}>
            <Input autoComplete="name" {...form.register('fullName')} />
          </FormField>
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
        </fieldset>

        <SubmitButton pending={pending} pendingLabel={tForms('pending')}>
          {t('signup.submit')}
        </SubmitButton>

        <p className="text-center text-sm text-muted-foreground">
          {t('signup.hasAccount')}{' '}
          <Link
            href="/login"
            className="font-semibold text-brand-text underline-offset-4 hover:underline"
          >
            {t('signup.logIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}

function SentState({ email }: { email: string }) {
  const t = useTranslations('auth');
  const { reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: true } | { ok: false; error: ActionError } | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-8">
      <div role="status">
        <AuthHeading
          icon={<MailCheck />}
          title={t('signup.sentTitle')}
          description={t.rich('signup.sentDescription', {
            email: email,
            b: (chunks) => (
              <strong dir="ltr" className="font-semibold break-all text-foreground">
                {chunks}
              </strong>
            ),
          })}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t('signup.sentHint')}</p>
      {notice?.ok ? <FormAlert tone="success">{t('signup.resent')}</FormAlert> : null}
      {notice && !notice.ok ? <FormAlert>{reasonText(notice.error)}</FormAlert> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="sm:flex-1"
          disabled={pending || notice?.ok === true}
          onClick={() => {
            startTransition(async () => {
              const result = await resendConfirmation(email);
              setNotice(result.ok ? { ok: true } : { ok: false, error: result.error });
            });
          }}
        >
          {t('signup.resend')}
        </Button>
        <Button
          variant="ghost"
          className="sm:flex-1"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t('signup.back')}
        </Button>
      </div>
    </div>
  );
}
