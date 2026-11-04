'use client';

import { Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ActionResult } from '@/lib/errors';
import { OVERRIDE_KEYS, type OverrideKey } from '../schemas/platform';
import { assignPlan, deleteOverride, installDemo, saveOverride } from '../server/actions';

function useRun() {
  const t = useTranslations('admin.toast');
  const [pending, startTransition] = useTransition();
  const run = (
    action: () => Promise<ActionResult>,
    onFields?: (fields: Record<string, string>) => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(t('saved'));
        return;
      }
      const fields = result.error.details?.fields;
      if (fields && onFields) onFields(fields);
      else toast.error(t('failed'));
    });
  };
  return { pending, run };
}

/** Plan assignment (Phase 1: manual billing). */
export function PlanForm({
  restaurantId,
  current,
  plans,
}: {
  restaurantId: string;
  current: string | null;
  plans: { code: string; label: string }[];
}) {
  const t = useTranslations('admin.venue');
  const { pending, run } = useRun();
  const [plan, setPlan] = useState(current ?? plans[0]?.code ?? 'basic');
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => assignPlan({ restaurantId, plan }));
      }}
    >
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t('plan')}</legend>
        {plans.map((option) => (
          <label
            key={option.code}
            className="flex min-h-target cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-medium has-checked:border-brand has-checked:bg-brand-subtle has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="plan"
              className="sr-only"
              checked={plan === option.code}
              onChange={() => {
                setPlan(option.code);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending || plan === current}>
        {t('planSave')}
      </Button>
    </form>
  );
}

/** Flag overrides with expiry and a mandatory reason (ADR-0015). */
export function OverridesEditor({
  restaurantId,
  overrides,
}: {
  restaurantId: string;
  overrides: {
    id: string;
    key: string;
    enabled: boolean;
    expiresAt: string | null;
    reason: string | null;
  }[];
}) {
  const t = useTranslations('admin.venue');
  const tErrors = useTranslations('admin.errors');
  const format = useFormatter();
  const { pending, run } = useRun();
  const [key, setKey] = useState<OverrideKey>('ai_unlimited');
  const [enabled, setEnabled] = useState(true);
  const [expiresOn, setExpiresOn] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-4">
      {overrides.length === 0 ? (
        <p className="text-muted-foreground">{t('noOverrides')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {overrides.map((override) => (
            <li
              key={override.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-mono text-sm font-semibold text-foreground" dir="ltr">
                  {override.key} · {override.enabled ? t('enabled') : t('disabled')}
                </span>
                <span className="text-sm text-muted-foreground">
                  {override.expiresAt
                    ? t('until', {
                        date: format.dateTime(new Date(override.expiresAt), {
                          dateStyle: 'medium',
                        }),
                      })
                    : t('forever')}
                  {override.reason ? ` · ${override.reason}` : ''}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('removeLabel', { key: override.key })}
                disabled={pending}
                onClick={() => {
                  run(() => deleteOverride({ restaurantId, overrideId: override.id }));
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          run(() => saveOverride({ restaurantId, key, enabled, expiresOn, reason }), setErrors);
        }}
      >
        <FormField label={t('key')}>
          {(control) => (
            <select
              {...control}
              value={key}
              onChange={(event) => {
                setKey(event.target.value as OverrideKey);
              }}
              className="h-target rounded-md border border-input bg-background px-3 font-mono text-sm"
              dir="ltr"
            >
              {OVERRIDE_KEYS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t('enabled')} / {t('disabled')}
          </legend>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <label
                key={String(value)}
                className="flex min-h-target cursor-pointer items-center rounded-full border border-border px-4 text-sm font-medium has-checked:border-brand has-checked:bg-brand-subtle has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name="override-enabled"
                  className="sr-only"
                  checked={enabled === value}
                  onChange={() => {
                    setEnabled(value);
                  }}
                />
                {value ? t('enabled') : t('disabled')}
              </label>
            ))}
          </div>
        </fieldset>
        <FormField
          label={t('expires')}
          error={errors.expiresOn ? tErrors('dateInvalid') : undefined}
        >
          <Input
            type="date"
            value={expiresOn}
            onChange={(event) => {
              setExpiresOn(event.target.value);
            }}
          />
        </FormField>
        <FormField
          label={t('reason')}
          error={errors.reason ? tErrors('reasonRequired') : undefined}
        >
          <Input
            value={reason}
            dir="auto"
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        </FormField>
        <Button type="submit" className="self-start" disabled={pending}>
          {t('add')}
        </Button>
      </form>
    </div>
  );
}

/** Installs or completes the sales demo venue (Super Admin). */
export function InstallDemoButton({ partial }: { partial: boolean }) {
  const t = useTranslations('admin.demo');
  const failed = useTranslations('admin.toast');
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await installDemo();
          if (result.ok) toast.success(t('done'));
          else if (result.error.details?.reason === 'slug_taken') toast.error(t('slugTaken'));
          else toast.error(failed('failed'));
        });
      }}
    >
      {pending ? t('installing') : partial ? t('complete') : t('install')}
    </Button>
  );
}
