import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { loadOverviewFacts, onboardingChecklist, type ChecklistStep } from '@/features/backoffice';
import { getTenantContext } from '@/features/tenancy';
import { getSessionClaims } from '@/lib/auth/session';
import { cn } from '@/lib/utils';
import { SettingsForms } from './settings-forms';
import { VenueMedia, settingsData } from './settings-screen';

/**
 * `/dashboard/setup` (P1-14, spec 04 onboarding): the getting-started steps in order, the next
 * one open. Venue and identity are edited in place; menu, tables, print and team link to their
 * screens. Target: a published menu in under 30 minutes.
 */
export async function SetupScreen() {
  const [claims, tenant, result] = await Promise.all([
    getSessionClaims(),
    getTenantContext(),
    settingsData(),
  ]);
  if (!claims || tenant.kind !== 'ok' || !result) return null;
  const { restaurant } = tenant.context;
  const checklist = onboardingChecklist(await loadOverviewFacts(claims, restaurant.id));
  const t = await getTranslations('dashboard.setup');
  const tSteps = await getTranslations('dashboard.checklist');
  const forms = (only: string[]) =>
    result.kind === 'ok' ? (
      <SettingsForms
        data={result.data}
        only={only}
        mediaSlot={<VenueMedia logo={result.logo} cover={result.cover} />}
      />
    ) : null;
  const link = (href: `/dashboard${string}`, label: string, primary = false) => (
    <Link
      href={href}
      className={buttonVariants({
        variant: primary ? 'default' : 'outline',
        // Long labels (Arabic, small phones) wrap instead of sticking out.
        className: 'h-auto min-h-target max-w-full py-2 text-center whitespace-normal',
      })}
    >
      {label}
    </Link>
  );

  const content: Record<ChecklistStep, ReactNode> = {
    venue: forms(['venue', 'hours']),
    menu: (
      <div className="flex flex-wrap gap-2">
        {link('/dashboard/menu/import', t('importMenu'), true)}
        {link('/dashboard/menu', t('openEditor'))}
      </div>
    ),
    branding: forms(['appearance']),
    tables: (
      <div className="flex flex-wrap gap-2">
        {link('/dashboard/tables', t('createTables'), true)}
        {link('/dashboard/tables/print?template=a6', t('printTents'))}
      </div>
    ),
    team: (
      <div className="flex flex-wrap gap-2">{link('/dashboard/team', t('openTeam'), true)}</div>
    ),
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} description={t('description')} />
      {checklist.complete ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md bg-success-subtle p-4 font-semibold text-foreground"
        >
          {t('allDone')}
          <a
            href={`/${restaurant.slug}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('viewMenu')}
          </a>
        </p>
      ) : null}
      <ol className="flex flex-col gap-4">
        {checklist.steps.map((step, index) => (
          <li key={step.key} id={step.key} className="scroll-mt-24">
            <details
              open={step.key === checklist.next || undefined}
              className="group rounded-md border border-border bg-card shadow-sm"
            >
              <summary className="flex min-h-target-staff cursor-pointer list-none items-center gap-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold',
                    step.done ? 'bg-success text-on-brand' : 'bg-muted text-foreground',
                  )}
                >
                  {step.done ? <Check className="size-5" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t('step', { number: index + 1 })} ·{' '}
                    {step.done ? tSteps('done') : tSteps('next')}
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {tSteps(`${step.key}.title`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tSteps(`${step.key}.description`)}
                  </span>
                </span>
              </summary>
              <div className="border-t border-border p-5">{content[step.key]}</div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
