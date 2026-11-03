'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useFormErrors } from '@/components/forms/use-form-errors';

const EDITOR_KEYS = ['minAboveMax', 'minAboveOptions', 'noOptions', 'countInvalid'] as const;
type EditorKey = (typeof EDITOR_KEYS)[number];

function isEditorKey(key: string): key is EditorKey {
  return (EDITOR_KEYS as readonly string[]).includes(key);
}

/** Field error text: menu editor rules first, then the shared form messages. */
export function useFieldError() {
  const t = useTranslations('menuEditor.fieldErrors');
  const { fieldError } = useFormErrors();
  return useCallback(
    (key: string | undefined): string | undefined =>
      key && isEditorKey(key) ? t(key) : fieldError(key),
    [t, fieldError],
  );
}
