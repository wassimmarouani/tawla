'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { VENUE_TYPES } from '@/features/onboarding';
import { LOCALES, type Locale } from '@/i18n/locales';
import type { ActionResult } from '@/lib/errors';
import { ROUNDING_STEPS, formatMoney } from '@/lib/money';
import { WEEKDAYS, type Schedule, type Weekday } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { COLOR_MODES } from '../schemas/settings';
import {
  updateAppearance,
  updateHours,
  updateLanguages,
  updateLinks,
  updateManualStatus,
  updateServiceSettings,
  updateVenueInfo,
} from '../server/actions';
import { BrandPreview } from './brand-preview';

export interface SettingsData {
  name: string;
  type: string;
  address: string;
  schedule: Schedule;
  manualStatus: 'auto' | 'open' | 'closed';
  locales: Locale[];
  defaultLocale: Locale;
  brandColor: string;
  colorMode: (typeof COLOR_MODES)[number];
  /** Dominant colour of the logo, offered as the brand colour. */
  logoColor: string | null;
  wifiName: string;
  wifiPassword: string;
  googleReviewUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  sessionTimeoutMinutes: number;
  dayCutoff: string;
  roundingStep: (typeof ROUNDING_STEPS)[number];
}

const SETTINGS_ERRORS = new Set(['urlInvalid', 'colorInvalid', 'cutoffInvalid']);

/** Field error key → text: settings-specific keys, else the shared form errors. */
function useFieldMessage() {
  const tSettings = useTranslations('settings.errors');
  const tForms = useTranslations('common.forms.errors');
  return (key: string | undefined) => {
    if (!key) return undefined;
    return SETTINGS_ERRORS.has(key) ? tSettings(key as 'urlInvalid') : tForms(key as 'required');
  };
}

/** Runs a settings action: field errors back to the form, a toast for the rest. */
function useSave() {
  const t = useTranslations('settings');
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = (action: () => Promise<ActionResult>) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setErrors({});
        toast.success(t('saved'));
        return;
      }
      const fields = result.error.details?.fields;
      if (fields) {
        setErrors(fields);
        return;
      }
      const reason = result.error.details?.reason;
      toast.error(
        reason === 'readOnly'
          ? t('errors.readOnly')
          : result.error.code === 'FORBIDDEN'
            ? t('errors.forbidden')
            : t('failed'),
      );
    });
  };
  return { pending, save, errors };
}

function Section({
  title,
  description,
  onSubmit,
  pending,
  children,
}: {
  title: string;
  description?: string;
  onSubmit: () => void;
  pending: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('settings');
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-5 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-title tracking-heading text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
      <Button
        type="submit"
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {t('save')}
      </Button>
    </form>
  );
}

/** Settings page body (P1-14, spec 04 "Settings"). Each section saves on its own. */
export function SettingsForms({
  data,
  only,
  mediaSlot,
}: {
  data: SettingsData;
  only?: readonly string[];
  /** Logo and cover uploads (rendered by the server page, saved on their own). */
  mediaSlot?: ReactNode;
}) {
  const show = (key: string) => !only || only.includes(key);
  return (
    <div className="flex flex-col gap-6">
      {show('venue') ? <VenueForm data={data} /> : null}
      {show('hours') ? <HoursForm data={data} /> : null}
      {show('status') ? <StatusForm data={data} /> : null}
      {show('appearance') ? <AppearanceForm data={data} mediaSlot={mediaSlot} /> : null}
      {show('languages') ? <LanguagesForm data={data} /> : null}
      {show('links') ? <LinksForm data={data} /> : null}
      {show('service') ? <ServiceForm data={data} /> : null}
    </div>
  );
}

function VenueForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.venue');
  const tTypes = useTranslations('onboarding.venueTypes');
  const fieldMessage = useFieldMessage();
  const { pending, save, errors } = useSave();
  const [name, setName] = useState(data.name);
  const [type, setType] = useState(data.type);
  const [address, setAddress] = useState(data.address);
  return (
    <Section
      title={t('title')}
      pending={pending}
      onSubmit={() => {
        save(() => updateVenueInfo({ name, type: type as (typeof VENUE_TYPES)[number], address }));
      }}
    >
      <FormField label={t('name')} error={fieldMessage(errors.name)}>
        <Input
          value={name}
          dir="auto"
          maxLength={120}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">{t('type')}</legend>
        <div className="flex flex-wrap gap-2">
          {VENUE_TYPES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex min-h-target cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring',
                type === value
                  ? 'border-brand bg-brand-subtle text-brand-on-subtle'
                  : 'border-border',
              )}
            >
              <input
                type="radio"
                name="venue-type"
                className="sr-only"
                checked={type === value}
                onChange={() => {
                  setType(value);
                }}
              />
              {tTypes(value)}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField label={t('address')} hint={t('addressHint')}>
        <Input
          value={address}
          dir="auto"
          maxLength={200}
          onChange={(event) => {
            setAddress(event.target.value);
          }}
        />
      </FormField>
    </Section>
  );
}

/** Full weekday name (the editor has room; the menu uses short names). 2024-01-01 is a Monday. */
function longWeekday(day: Weekday, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, day)),
  );
}

type WeeklyEntry = Schedule['weekly'][number];
type Range = WeeklyEntry['ranges'][number];

function HoursForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.hours');
  const locale = useLocale();
  const { pending, save, errors } = useSave();
  const [weekly, setWeekly] = useState<Record<Weekday, Range[]>>(() => {
    const byDay = {} as Record<Weekday, Range[]>;
    for (const day of WEEKDAYS) {
      byDay[day] = data.schedule.weekly.find((entry) => entry.day === day)?.ranges ?? [];
    }
    return byDay;
  });
  const [exceptions, setExceptions] = useState<Schedule['exceptions']>(data.schedule.exceptions);

  const setRanges = (day: Weekday, ranges: Range[]) => {
    setWeekly((current) => ({ ...current, [day]: ranges }));
  };

  return (
    <Section
      title={t('title')}
      description={t('description')}
      pending={pending}
      onSubmit={() => {
        save(() =>
          updateHours({
            schedule: {
              weekly: WEEKDAYS.filter((day) => weekly[day].length > 0).map((day) => ({
                day,
                ranges: weekly[day],
              })),
              exceptions,
            },
          }),
        );
      }}
    >
      {errors.schedule ? (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {t('invalid')}
        </p>
      ) : null}
      <ul className="flex flex-col divide-y divide-border">
        {WEEKDAYS.map((day) => {
          const ranges = weekly[day];
          const label = longWeekday(day, locale);
          return (
            <li key={day} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-h-target items-center justify-between gap-3 sm:w-48">
                <span className="font-medium text-foreground">{label}</span>
                <label className="flex min-h-target items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={ranges.length > 0}
                    onCheckedChange={(checked) => {
                      setRanges(day, checked ? [{ from: '08:00', to: '22:00' }] : []);
                    }}
                    aria-label={`${label} : ${t('open')}`}
                  />
                  {ranges.length > 0 ? t('open') : t('closed')}
                </label>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${label} ${t('from')}`}
                      value={range.from}
                      onChange={(event) => {
                        setRanges(
                          day,
                          ranges.map((item, position) =>
                            position === index ? { ...item, from: event.target.value } : item,
                          ),
                        );
                      }}
                      className="w-32"
                    />
                    <span aria-hidden="true">→</span>
                    <Input
                      type="time"
                      aria-label={`${label} ${t('to')}`}
                      value={range.to === '24:00' ? '00:00' : range.to}
                      onChange={(event) => {
                        setRanges(
                          day,
                          ranges.map((item, position) =>
                            position === index ? { ...item, to: event.target.value } : item,
                          ),
                        );
                      }}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${label} : ${t('remove')}`}
                      onClick={() => {
                        setRanges(
                          day,
                          ranges.filter((_, position) => position !== index),
                        );
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {ranges.length > 0 && ranges.length < 6 ? (
                  <Button
                    type="button"
                    variant="link"
                    className="self-start"
                    onClick={() => {
                      setRanges(day, [...ranges, { from: '18:00', to: '23:00' }]);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    {t('add')}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold text-foreground">{t('exceptions')}</legend>
        {exceptions.map((exception, index) => (
          <div key={index} className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              aria-label={t('exceptionDate')}
              value={exception.date}
              onChange={(event) => {
                setExceptions((current) =>
                  current.map((item, position) =>
                    position === index ? { ...item, date: event.target.value } : item,
                  ),
                );
              }}
              className="w-44"
            />
            <span className="text-sm text-muted-foreground">
              {'closed' in exception ? t('exceptionClosed') : t('open')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('removeException')}
              onClick={() => {
                setExceptions((current) => current.filter((_, position) => position !== index));
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            const date = new Date().toISOString().slice(0, 10);
            setExceptions((current) => [...current, { date, closed: true }]);
          }}
        >
          <Plus aria-hidden="true" />
          {t('addException')}
        </Button>
      </fieldset>
    </Section>
  );
}

function StatusForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.status');
  const { pending, save } = useSave();
  const [status, setStatus] = useState(data.manualStatus);
  const set = (next: 'auto' | 'open' | 'closed') => {
    setStatus(next);
    save(() => updateManualStatus({ status: next, hours: null }));
  };
  const current =
    status === 'auto' ? t('auto') : status === 'closed' ? t('closedNow') : t('openNow');
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-title tracking-heading text-foreground">{t('title')}</h2>
        <p role="status" className="text-sm text-muted-foreground">
          {current}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status !== 'closed' ? (
          <Button
            variant="destructive-soft"
            disabled={pending}
            onClick={() => {
              set('closed');
            }}
          >
            {t('close')}
          </Button>
        ) : null}
        {status !== 'open' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              set('open');
            }}
          >
            {t('openAction')}
          </Button>
        ) : null}
        {status !== 'auto' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              set('auto');
            }}
          >
            {t('resume')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function LanguagesForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.languages');
  const tErrors = useTranslations('settings.errors');
  const tLanguages = useTranslations('common.languages');
  const { pending, save, errors } = useSave();
  const [locales, setLocales] = useState<Locale[]>(data.locales);
  const [defaultLocale, setDefaultLocale] = useState<Locale>(data.defaultLocale);
  const error = errors.locales ?? errors.defaultLocale;
  return (
    <Section
      title={t('title')}
      description={t('description')}
      pending={pending}
      onSubmit={() => {
        save(() => updateLanguages({ locales, defaultLocale }));
      }}
    >
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {tErrors(error as 'localesRequired')}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {LOCALES.map((locale) => (
          <div key={locale} className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-target items-center gap-3 text-md text-foreground">
              <Checkbox
                aria-label={tLanguages(locale)}
                checked={locales.includes(locale)}
                onCheckedChange={(checked) => {
                  setLocales((current) =>
                    checked ? [...current, locale] : current.filter((item) => item !== locale),
                  );
                }}
              />
              {tLanguages(locale)}
            </label>
            <label className="flex min-h-target items-center gap-2 text-sm text-muted-foreground">
              <input
                type="radio"
                name="default-locale"
                className="size-4 accent-brand"
                checked={defaultLocale === locale}
                onChange={() => {
                  setDefaultLocale(locale);
                }}
              />
              {t('default')}
            </label>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AppearanceForm({ data, mediaSlot }: { data: SettingsData; mediaSlot: ReactNode }) {
  const t = useTranslations('settings.appearance');
  const tErrors = useTranslations('settings.errors');
  const { pending, save, errors } = useSave();
  const [color, setColor] = useState(data.brandColor);
  const [mode, setMode] = useState(data.colorMode);
  const valid = /^#[0-9a-f]{6}$/i.test(color);
  return (
    <Section
      title={t('title')}
      pending={pending}
      onSubmit={() => {
        save(() => updateAppearance({ brandColor: color, colorMode: mode }));
      }}
    >
      {mediaSlot}
      <FormField label={t('color')} error={errors.brandColor ? tErrors('colorInvalid') : undefined}>
        {(control) => (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              aria-hidden="true"
              tabIndex={-1}
              value={valid ? color : '#000000'}
              onChange={(event) => {
                setColor(event.target.value);
              }}
              className="size-target cursor-pointer rounded-sm border border-border bg-card"
            />
            <Input
              {...control}
              value={color}
              dir="ltr"
              maxLength={7}
              onChange={(event) => {
                setColor(event.target.value.trim());
              }}
              className="w-32 font-mono"
            />
            {data.logoColor && data.logoColor.toLowerCase() !== color.toLowerCase() ? (
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setColor(data.logoColor ?? color);
                }}
              >
                {t('useLogo')}
              </Button>
            ) : null}
          </div>
        )}
      </FormField>
      {valid ? (
        <BrandPreview
          color={color}
          label={t('preview')}
          button={t('previewButton')}
          badge={t('previewBadge')}
        />
      ) : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">{t('mode')}</legend>
        <div className="flex flex-wrap gap-2">
          {COLOR_MODES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex min-h-target cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring',
                mode === value
                  ? 'border-brand bg-brand-subtle text-brand-on-subtle'
                  : 'border-border',
              )}
            >
              <input
                type="radio"
                name="color-mode"
                className="sr-only"
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                }}
              />
              {t(`modes.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}

function LinksForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.links');
  const fieldMessage = useFieldMessage();
  const { pending, save, errors } = useSave();
  const [values, setValues] = useState({
    wifiName: data.wifiName,
    wifiPassword: data.wifiPassword,
    googleReviewUrl: data.googleReviewUrl,
    instagramUrl: data.instagramUrl,
    facebookUrl: data.facebookUrl,
    tiktokUrl: data.tiktokUrl,
  });
  const field = (key: keyof typeof values, label: string, hint?: string, url = false) => (
    <FormField label={label} hint={hint} error={fieldMessage(errors[key])}>
      <Input
        value={values[key]}
        dir={url ? 'ltr' : 'auto'}
        inputMode={url ? 'url' : undefined}
        maxLength={url ? 300 : 64}
        onChange={(event) => {
          setValues((current) => ({ ...current, [key]: event.target.value }));
        }}
      />
    </FormField>
  );
  return (
    <Section
      title={t('title')}
      pending={pending}
      onSubmit={() => {
        save(() => updateLinks(values));
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {field('wifiName', t('wifiName'))}
        {field('wifiPassword', t('wifiPassword'))}
      </div>
      {field('googleReviewUrl', t('googleReview'), t('googleReviewHint'), true)}
      <div className="grid gap-5 md:grid-cols-3">
        {field('instagramUrl', t('instagram'), t('urlHint'), true)}
        {field('facebookUrl', t('facebook'), t('urlHint'), true)}
        {field('tiktokUrl', t('tiktok'), t('urlHint'), true)}
      </div>
    </Section>
  );
}

function ServiceForm({ data }: { data: SettingsData }) {
  const t = useTranslations('settings.service');
  const tErrors = useTranslations('settings.errors');
  const locale = useLocale();
  const { pending, save, errors } = useSave();
  const [timeout, setTimeoutMinutes] = useState(String(data.sessionTimeoutMinutes));
  const [cutoff, setCutoff] = useState(data.dayCutoff);
  const [step, setStep] = useState(data.roundingStep);
  return (
    <Section
      title={t('title')}
      pending={pending}
      onSubmit={() => {
        save(() =>
          updateServiceSettings({
            sessionTimeoutMinutes: Number(timeout),
            dayCutoff: cutoff,
            roundingStep: step,
          }),
        );
      }}
    >
      <FormField
        label={t('timeout')}
        hint={t('timeoutHint')}
        error={errors.sessionTimeoutMinutes ? t('timeoutHint') : undefined}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={30}
          max={240}
          step={5}
          value={timeout}
          onChange={(event) => {
            setTimeoutMinutes(event.target.value);
          }}
          className="w-32"
        />
      </FormField>
      <FormField
        label={t('cutoff')}
        hint={t('cutoffHint')}
        error={errors.dayCutoff ? tErrors('cutoffInvalid') : undefined}
      >
        <Input
          type="time"
          value={cutoff}
          onChange={(event) => {
            setCutoff(event.target.value);
          }}
          className="w-32"
        />
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">{t('rounding')}</legend>
        <div className="flex flex-wrap gap-2">
          {ROUNDING_STEPS.map((value) => (
            <label
              key={value}
              className={cn(
                'flex min-h-target cursor-pointer items-center rounded-full border px-4 text-sm font-medium tabular-nums has-focus-visible:ring-2 has-focus-visible:ring-ring',
                step === value
                  ? 'border-brand bg-brand-subtle text-brand-on-subtle'
                  : 'border-border',
              )}
            >
              <input
                type="radio"
                name="rounding"
                className="sr-only"
                checked={step === value}
                onChange={() => {
                  setStep(value);
                }}
              />
              {formatMoney(value, locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr')}
            </label>
          ))}
        </div>
      </fieldset>
    </Section>
  );
}
