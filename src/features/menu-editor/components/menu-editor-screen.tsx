import { ExternalLink, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { env } from '@/lib/env';
import { loadEditorMenu } from '../queries/editor-menu';
import { editorPageData } from '../server/page-data';
import { MenuEditor } from './menu-editor';

/** `/dashboard/menu` (P1-05): the menu editor, or a read-only notice. */
export async function MenuEditorScreen({ focus }: { focus?: string | undefined }) {
  const data = await editorPageData();
  if (!data) return null;
  const t = await getTranslations('menuEditor');
  const tSection = await getTranslations('dashboard.sections.menu');
  const { restaurant } = data;
  const categories = data.canEdit ? await loadEditorMenu(data.claims, restaurant.id) : [];
  const focused = categories
    .flatMap((category) => category.products)
    .find((product) => product.id === focus && product.isVisible);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={tSection('title')}
        description={t('page.description')}
        actions={
          <a
            href={`/${restaurant.slug}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('page.viewMenu')}
            <ExternalLink aria-hidden="true" className="rtl:-scale-x-100" />
          </a>
        }
      />
      {data.canEdit ? (
        <MenuEditor
          categories={categories}
          previewSrc={
            focused
              ? `/${restaurant.slug}?p=${encodeURIComponent(focused.slug)}`
              : `/${restaurant.slug}`
          }
          focusId={focused?.id ?? null}
          locale={data.locale}
          defaultLocale={restaurant.defaultLocale}
          locales={restaurant.locales}
          storageUrl={env.NEXT_PUBLIC_SUPABASE_URL}
        />
      ) : (
        <EmptyState icon={<Lock />} title={t('page.readOnly')} className="bg-card py-16" />
      )}
    </div>
  );
}
