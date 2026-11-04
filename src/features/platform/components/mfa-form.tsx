'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { startTotpEnrolment, verifyTotp } from '../server/actions';

/**
 * TOTP enrolment or verification (ADR-0005): platform users reach the console only with `aal2`.
 * `factorId` is set when a verified factor exists; otherwise the user enrols first.
 */
export function MfaForm({ factorId: verifiedFactor }: { factorId: string | null }) {
  const t = useTranslations('admin.mfa');
  const tErrors = useTranslations('admin.errors');
  const tForms = useTranslations('common.forms');
  const [pending, startTransition] = useTransition();
  const [enrolment, setEnrolment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const factorId = verifiedFactor ?? enrolment?.factorId ?? null;

  if (!factorId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">{t('enrolDescription')}</p>
        <Button
          size="lg"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await startTotpEnrolment();
              if (result.ok) setEnrolment(result.data);
            });
          }}
        >
          {t('start')}
        </Button>
      </div>
    );
  }

  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(false);
        startTransition(async () => {
          const result = await verifyTotp({ factorId, code: code.trim() });
          if (!result.ok) setError(true);
        });
      }}
    >
      {enrolment ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-muted-foreground">{t('enrolDescription')}</p>
          {/* Supabase returns the QR code as an SVG data URL: an <img>, never injected markup. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrolment.qrCode}
            alt={t('qr')}
            width={200}
            height={200}
            data-theme="light"
            className="rounded-sm bg-card p-2"
          />
          <p className="text-sm text-muted-foreground">
            {t('secret')}{' '}
            <code
              dir="ltr"
              data-totp-secret={enrolment.secret}
              className="font-mono break-all text-foreground"
            >
              {enrolment.secret}
            </code>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">{t('verifyDescription')}</p>
      )}
      <FormField label={t('code')} error={error ? tErrors('codeInvalid') : undefined}>
        <Input
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={6}
          onChange={(event) => {
            setCode(event.target.value);
          }}
          className="h-target-staff text-center font-mono text-2xl tracking-widest"
        />
      </FormField>
      <SubmitButton pending={pending} pendingLabel={tForms('pending')}>
        {t('submit')}
      </SubmitButton>
    </form>
  );
}
