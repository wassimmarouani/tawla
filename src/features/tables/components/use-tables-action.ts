'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionError, ActionResult } from '@/lib/errors';

const REASONS = ['numberTaken', 'rangeTooLarge', 'planZones', 'readOnly'] as const;
type Reason = (typeof REASONS)[number];

function isReason(value: unknown): value is Reason {
  return typeof value === 'string' && (REASONS as readonly string[]).includes(value);
}

/** Runs tables Server Actions in a transition; failures become a translated toast. */
export function useTablesAction() {
  const t = useTranslations('tables');
  const [pending, startTransition] = useTransition();

  const errorText = useCallback(
    (error: ActionError): string => {
      const reason = error.details?.reason;
      if (isReason(reason)) return t(`errors.${reason}`);
      if (error.code === 'FORBIDDEN') return t('errors.forbidden');
      if (error.code === 'NOT_FOUND') return t('errors.notFound');
      return t('toast.failed');
    },
    [t],
  );

  const perform = useCallback(
    async <T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      const result = await action();
      if (!result.ok) toast.error(errorText(result.error));
      return result;
    },
    [errorText],
  );

  const run = useCallback(
    <T>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) => {
      startTransition(async () => {
        const result = await perform(action);
        if (result.ok) onSuccess?.(result.data);
      });
    },
    [perform],
  );

  return { pending, run, perform };
}
