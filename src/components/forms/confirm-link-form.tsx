'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { ActionError, ActionResult } from '@/lib/errors';
import { FormAlert } from './form-alert';
import { SubmitButton } from './submit-button';
import { useFormErrors } from './use-form-errors';

interface ConfirmLinkFormProps {
  /** Server Action exchanging the email-link token (POST only, never on page load). */
  action: (tokenHash: string) => Promise<ActionResult>;
  tokenHash: string;
  submitLabel: string;
}

/**
 * Explicit confirmation of an email link. Mail scanners prefetch GET links; consuming the token
 * only on this POST keeps it for the person who clicks (CLAUDE.md rule 14).
 */
export function ConfirmLinkForm({ action, tokenHash, submitLabel }: ConfirmLinkFormProps) {
  const t = useTranslations('auth');
  const tForms = useTranslations('common.forms');
  const { reasonText } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionError | null>(null);

  return (
    <form
      method="post"
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await action(tokenHash);
          if (!result.ok) setError(result.error);
        });
      }}
    >
      {error ? (
        <FormAlert
          action={
            <Link
              href="/login"
              className="self-start font-semibold underline underline-offset-4 pointer-coarse:py-3"
            >
              {t('confirm.toLogin')}
            </Link>
          }
        >
          {reasonText(error)}
        </FormAlert>
      ) : null}
      <SubmitButton pending={pending} pendingLabel={tForms('pending')}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
