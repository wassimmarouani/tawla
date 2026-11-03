import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { aiAllowance } from '@/features/ai';
import { editorPageData } from '../server/page-data';
import { MenuImport } from './menu-import';

/** `/dashboard/menu/import` (P1-13): AI import of a paper menu. */
export async function MenuImportScreen() {
  const data = await editorPageData();
  if (!data) return null;
  const t = await getTranslations('menuEditor');
  const header = (
    <PageHeader
      eyebrow={(await getTranslations('dashboard.sections.menu'))('title')}
      title={t('ai.import.title')}
      description={t('ai.import.description')}
    />
  );
  if (!data.canEdit) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState icon={<Lock />} title={t('page.readOnly')} className="bg-card py-16" />
      </div>
    );
  }
  const allowance = await aiAllowance(data.restaurant.id);
  return (
    <div className="flex flex-col gap-8">
      {header}
      <MenuImport importsLeft={allowance.capReached ? 0 : allowance.importsLeft} />
    </div>
  );
}
