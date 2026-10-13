import { ShieldX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Button } from '@/components/ui/button';
import { logOut } from '@/features/auth';
import { clearRestaurantSelection } from '@/features/tenancy';
import { env } from '@/lib/env';

/** 403: restaurant outside the user's memberships, or a role without back-office access. */
export async function DashboardForbidden() {
  const t = await getTranslations('dashboard.forbidden');
  return (
    <div className="flex min-h-dvh flex-col px-gutter pt-safe pb-safe">
      <header className="flex h-16 items-center">
        <Logo name={env.NEXT_PUBLIC_APP_NAME} />
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <AuthHeading icon={<ShieldX />} title={t('title')} description={t('description')} />
          <div className="flex flex-col gap-3">
            <form action={clearRestaurantSelection}>
              <Button type="submit" size="lg" className="w-full">
                {t('back')}
              </Button>
            </form>
            <form action={logOut}>
              <Button type="submit" size="lg" variant="outline" className="w-full">
                {t('logOut')}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
