import { Store } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Button } from '@/components/ui/button';
import { logOut } from '@/features/auth';
import { CreateVenueForm } from '@/features/onboarding';
import { env } from '@/lib/env';

/** Signed in without a restaurant: create the venue (onboarding step 1 fallback). */
export async function DashboardNoRestaurant() {
  const t = await getTranslations('onboarding.create');
  const tNav = await getTranslations('dashboard.nav');
  return (
    <div className="flex min-h-dvh flex-col px-gutter pt-safe pb-safe">
      <header className="flex h-16 items-center justify-between gap-4">
        <Logo name={env.NEXT_PUBLIC_APP_NAME} />
        <form action={logOut}>
          <Button type="submit" variant="ghost" size="sm">
            {tNav('logOut')}
          </Button>
        </form>
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <AuthHeading icon={<Store />} title={t('title')} description={t('description')} />
          <CreateVenueForm />
        </div>
      </main>
    </div>
  );
}
