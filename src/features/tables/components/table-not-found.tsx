import { QrCode } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/states/empty-state';

/** A QR token that is unknown, deleted or regenerated (ADR-0012): a calm dead end. */
export async function TableNotFound() {
  const t = await getTranslations('client.tableNotFound');
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-gutter py-10">
      <EmptyState
        icon={<QrCode />}
        title={t('title')}
        description={t('description')}
        headingLevel={1}
        className="max-w-md bg-card py-12"
      />
    </main>
  );
}
