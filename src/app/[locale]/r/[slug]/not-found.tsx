import { SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/states/empty-state';

/** Unknown, suspended or deleted venue: same friendly page, nothing about the tenant leaks. */
export default function MenuNotFound() {
  const t = useTranslations('client.menuNotFound');
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-gutter py-10">
      <EmptyState
        icon={<SearchX />}
        title={t('title')}
        description={t('description')}
        headingLevel={1}
        className="w-full max-w-md bg-card"
      />
    </main>
  );
}
