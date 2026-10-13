import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/states';
import { getTenantContext } from '@/features/tenancy';
import { env } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta');
  return { title: t('title') };
}

export default async function DashboardHomePage() {
  const result = await getTenantContext();
  // The layout renders the no-restaurant and forbidden screens instead of this page.
  if (result.kind !== 'ok') return null;
  const { restaurant } = result.context;
  const t = await getTranslations('dashboard.home');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-title tracking-heading text-balance break-words text-foreground sm:text-4xl">
          {restaurant.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{t('publicAddress')}</span>
          <span dir="ltr" className="font-medium break-all text-foreground">
            {env.APP_DOMAIN}/{restaurant.slug}
          </span>
        </p>
      </div>
      <EmptyState
        icon={<BookOpen />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        className="bg-card py-16"
      />
    </div>
  );
}
