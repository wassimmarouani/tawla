import { getTranslations } from 'next-intl/server';
import { LoadingRegion } from '@/components/states/loading-region';
import { Skeleton } from '@/components/ui/skeleton';

/** Page skeleton inside the shell while a back-office section loads (spec 04 page template). */
export default async function DashboardLoading() {
  const t = await getTranslations('dashboard');
  return (
    <LoadingRegion label={t('loading')} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-md" />
    </LoadingRegion>
  );
}
