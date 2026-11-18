import { Check, Minus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { Locale } from '@/i18n/locales';
import { cn } from '@/lib/utils';
import { publicPlans } from '../server/plans';
import { LISTED_FEATURES, type ListedFeature } from '../services/pricing';

/** Visual order of features in the matrix (shortest to richest). */
const MATRIX_FEATURES: readonly ListedFeature[] = LISTED_FEATURES;

/** Plan codes shown as columns, from entry to premium. */
const MATRIX_PLAN_CODES = ['menu_qr', 'basic', 'pro', 'premium'] as const;

/**
 * Side-by-side feature matrix for the four plans (A1 — prospect can see at a glance what a tier
 * unlocks). Server component: reads `publicPlans()` once and renders a responsive table with a
 * sticky first column on mobile so long feature labels stay anchored while plans scroll.
 */
export async function PlanMatrix({ locale }: { locale: Locale }) {
  // Opt out of the marketing shell's static prerender: the DB isn't up during `next build`
  // in CI, same reason the `Offers` tile does it.
  await connection();
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const plans = await publicPlans();
  const byCode = new Map(plans.map((plan) => [plan.code, plan]));
  const columns = MATRIX_PLAN_CODES.map((code) => {
    const plan = byCode.get(code);
    return { code, name: plan?.name[locale] ?? code, features: new Set(plan?.features ?? []) };
  });

  return (
    <section aria-labelledby="matrix" className="border-y border-border bg-background">
      <div className="mx-auto max-w-6xl px-gutter py-16 sm:py-24">
        <div className="flex max-w-2xl reveal flex-col gap-3">
          <p className="text-sm font-semibold tracking-label text-brand-text uppercase">
            {t('matrix.eyebrow')}
          </p>
          <h2
            id="matrix"
            className="font-heading text-2xl font-title tracking-heading text-balance text-foreground sm:text-3xl lg:text-4xl"
          >
            {t('matrix.title')}
          </h2>
          <p className="text-lg text-pretty text-muted-foreground">{t('matrix.description')}</p>
        </div>

        <div className="mt-10 reveal overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full border-separate border-spacing-0 text-md">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky start-0 z-10 bg-card ps-5 pe-3 pt-5 pb-3 text-start text-xs font-semibold tracking-label text-muted-foreground uppercase"
                >
                  {t('matrix.featureLabel')}
                </th>
                {columns.map((col) => (
                  <th
                    key={col.code}
                    scope="col"
                    className={cn(
                      'px-3 pt-5 pb-3 text-center text-sm font-semibold whitespace-nowrap',
                      col.code === 'basic'
                        ? 'bg-brand-subtle text-brand-on-subtle'
                        : 'text-foreground',
                    )}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <span className="font-heading text-base font-title tracking-heading">
                        {col.name}
                      </span>
                      {col.code === 'basic' ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold tracking-label text-on-brand uppercase">
                          {t('offers.recommended')}
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_FEATURES.map((feature, index) => (
                <tr key={feature} className={cn(index % 2 === 1 && 'bg-muted/40')}>
                  <th
                    scope="row"
                    className="sticky start-0 z-10 bg-inherit py-3 ps-5 pe-3 text-start font-medium text-pretty text-foreground"
                  >
                    {t(`pricing.features.${feature}`)}
                  </th>
                  {columns.map((col) => {
                    const included = col.features.has(feature);
                    return (
                      <td
                        key={col.code}
                        className={cn(
                          'px-3 py-3 text-center align-middle',
                          col.code === 'basic' && 'bg-brand-subtle/40',
                        )}
                      >
                        <span className="sr-only">
                          {included ? t('matrix.included') : t('matrix.excluded')}
                        </span>
                        {included ? (
                          <span
                            aria-hidden="true"
                            className="inline-grid size-6 place-items-center rounded-full bg-success-subtle text-success"
                          >
                            <Check className="size-3.5" />
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="inline-grid size-6 place-items-center rounded-full bg-muted text-muted-foreground/60"
                          >
                            <Minus className="size-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-pretty text-muted-foreground">
          {t('matrix.footnote')}
        </p>
      </div>
    </section>
  );
}
