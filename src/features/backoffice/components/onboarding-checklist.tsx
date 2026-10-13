import { Check, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Checklist } from '../services/checklist';

/** Getting-started card on the overview (spec 04): stays until every step is done. */
export async function OnboardingChecklist({ checklist }: { checklist: Checklist }) {
  if (checklist.complete) return null;
  const t = await getTranslations('dashboard.checklist');
  const percent = Math.round((checklist.done / checklist.total) * 100);

  return (
    <section
      aria-labelledby="checklist-title"
      className="rounded-md border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="checklist-title" className="text-xl font-title tracking-heading text-foreground">
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t('progress', { done: checklist.done, total: checklist.total })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-labelledby="checklist-title"
        aria-valuemin={0}
        aria-valuemax={checklist.total}
        aria-valuenow={checklist.done}
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-brand-solid"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      <ol className="mt-5 flex flex-col divide-y divide-border">
        {checklist.steps.map((step) => {
          const next = step.key === checklist.next;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  'group -mx-2 flex min-h-target items-center gap-4 rounded-xs px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !step.done && 'hover:bg-accent',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border-2',
                    step.done
                      ? 'border-success bg-success text-background'
                      : next
                        ? 'border-brand-solid'
                        : 'border-border',
                  )}
                >
                  {step.done ? <Check className="size-4" strokeWidth={3} /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'font-semibold',
                      step.done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {t(`${step.key}.title`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`${step.key}.description`)}
                  </span>
                </span>
                <span className="sr-only">{step.done ? t('done') : t('next')}</span>
                {step.done ? null : (
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground rtl:-scale-x-100"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
