import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { OnboardingChecklist, loadOverviewFacts, onboardingChecklist } from '@/features/backoffice';
import { getTenantContext } from '@/features/tenancy';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta');
  return { title: t('title') };
}

/** Overview (spec 04): venue, public address, menu size and the getting-started checklist. */
export default async function DashboardHomePage() {
  const result = await getTenantContext();
  const claims = await getSessionClaims();
  // The layout renders the no-restaurant and forbidden screens instead of this page.
  if (result.kind !== 'ok' || !claims) return null;
  const { restaurant } = result.context;
  const t = await getTranslations('dashboard.home');
  const facts = await loadOverviewFacts(claims, restaurant.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={restaurant.name}
        description={
          <p className="flex flex-wrap items-center gap-x-2">
            <span>{t('publicAddress')}</span>
            <span dir="ltr" className="font-medium break-all text-foreground">
              {env.APP_DOMAIN}/{restaurant.slug}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t('products', { count: facts.products })},{' '}
              {t('categories', { count: facts.categories })}
            </span>
          </p>
        }
        actions={
          <a
            href={`/${restaurant.slug}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('viewMenu')}
            <ExternalLink aria-hidden="true" className="rtl:-scale-x-100" />
          </a>
        }
      />
      <OnboardingChecklist checklist={onboardingChecklist(facts)} />
    </div>
  );
}
