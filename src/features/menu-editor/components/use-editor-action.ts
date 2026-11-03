'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionError, ActionResult } from '@/lib/errors';

const REASON_KEYS = [
  'readOnly',
  'image_too_large',
  'image_unsupported_type',
  'image_too_many_pixels',
  'image_unreadable',
] as const;
type ReasonKey = (typeof REASON_KEYS)[number];

function isReasonKey(value: unknown): value is ReasonKey {
  return typeof value === 'string' && (REASON_KEYS as readonly string[]).includes(value);
}

/**
 * Runs menu editor Server Actions in a transition and reports failures in a toast. The actions
 * refresh the page themselves (`refresh()`), so callers only handle success feedback.
 */
export function useEditorAction() {
  const t = useTranslations('menuEditor');
  const [pending, startTransition] = useTransition();

  const errorText = useCallback(
    (error: ActionError): string => {
      const reason = error.details?.reason;
      if (isReasonKey(reason)) return t(`errors.${reason}`);
      if (error.code === 'FORBIDDEN') return t('errors.forbidden');
      if (error.code === 'NOT_FOUND') return t('errors.notFound');
      return t('toast.failed');
    },
    [t],
  );

  /** Awaitable form, for undo callbacks: resolves `true` on success. */
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

  return { pending, run, perform, errorText };
}
