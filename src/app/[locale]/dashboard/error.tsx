'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';

/** A back-office page failed: the shell stays usable and the page can be retried in place. */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.states.error');
  return (
    <ErrorState
      title={t('title')}
      description={t('description')}
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          {t('retry')}
        </Button>
      }
    />
  );
}
