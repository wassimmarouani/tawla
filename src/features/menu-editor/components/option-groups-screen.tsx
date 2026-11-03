import { ChevronLeft, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { loadOptionGroups } from '../queries/editor-menu';
import { editorPageData } from '../server/page-data';
import { OptionGroupsEditor } from './option-groups-editor';

/** `/dashboard/menu/options` (P1-06): reusable option groups. */
export async function OptionGroupsScreen() {
  const data = await editorPageData();
  if (!data) return null;
  const t = await getTranslations('menuEditor');
  const { restaurant } = data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/menu"
            className="inline-flex min-h-target items-center gap-1 rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            {t('options.back')}
          </Link>
        }
        title={t('options.title')}
        description={t('options.description')}
      />
      {data.canEdit ? (
        <OptionGroupsEditor
          groups={await loadOptionGroups(data.claims, restaurant.id)}
          locale={data.locale}
          defaultLocale={restaurant.defaultLocale}
          locales={restaurant.locales}
        />
      ) : (
        <EmptyState icon={<Lock />} title={t('page.readOnly')} className="bg-card py-16" />
      )}
    </div>
  );
}
