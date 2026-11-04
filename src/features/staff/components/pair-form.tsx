'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { useFormErrors } from '@/components/forms/use-form-errors';
import { Input } from '@/components/ui/input';
import type { ActionError } from '@/lib/errors';
import { pairDevice } from '../server/staff-actions';

/** Pairing code entry on the device (ADR-0010 §3); prefilled when opened from the QR code. */
export function PairForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations('staff.pair');
  const tForms = useTranslations('common.forms');
  const { fieldError, reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(initialCode);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<ActionError | null>(null);

  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setCodeError(undefined);
        setFormError(null);
        startTransition(async () => {
          const result = await pairDevice(code);
          if (result.ok) return;
          const field = result.error.details?.fields?.code;
          if (field) setCodeError(fieldError(field));
          else setFormError(result.error);
        });
      }}
    >
      {formError ? <FormAlert>{reasonText(formError)}</FormAlert> : null}
      <FormField label={t('code')} error={codeError} hint={t('help')}>
        <Input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
          }}
          dir="ltr"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          className="h-target-staff text-center font-mono text-2xl tracking-widest uppercase"
        />
      </FormField>
      <SubmitButton pending={pending} pendingLabel={tForms('pending')}>
        {t('submit')}
      </SubmitButton>
    </form>
  );
}
