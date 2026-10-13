import { Hammer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import type { NavKey } from '../services/navigation';

/**
 * A back-office section that the next Phase 1 tasks fill (spec 04): a real, reachable page with
 * an honest state instead of a dead link.
 */
export async function SectionPlaceholder({ section }: { section: Exclude<NavKey, 'overview'> }) {
  const t = await getTranslations('dashboard.sections');
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t(`${section}.title`)} description={t(`${section}.description`)} />
      <EmptyState
        icon={<Hammer />}
        title={t('comingTitle')}
        description={t('comingDescription')}
        className="bg-card py-16"
      />
    </div>
  );
}
