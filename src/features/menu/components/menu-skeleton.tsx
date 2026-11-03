import { LoadingRegion } from '@/components/states/loading-region';
import { Skeleton } from '@/components/ui/skeleton';

/** Final-size placeholders: header, category bar, two cards (no layout shift). */
export function MenuSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="block min-h-dvh bg-background">
      <Skeleton className="h-60 w-full rounded-none sm:h-72 lg:h-80" />
      <div className="relative mx-gutter -mt-11 max-w-3xl rounded-lg bg-card px-5 pt-11 pb-4 shadow-md md:mx-auto">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto mt-4 h-5 w-32" />
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl gap-2 px-gutter">
        <Skeleton className="h-target w-24 rounded-full" />
        <Skeleton className="h-target w-32 rounded-full" />
        <Skeleton className="h-target w-28 rounded-full" />
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 px-gutter sm:grid-cols-3">
        <Skeleton className="aspect-square rounded-md" />
        <Skeleton className="aspect-square rounded-md" />
      </div>
    </LoadingRegion>
  );
}
