'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/i18n/actions';
import type { Locale } from '@/i18n/locales';
import { classes as cn } from '@/lib/classes';

const SHORT: Readonly<Record<Locale, string>> = { fr: 'FR', ar: 'ع', en: 'EN' };

interface LocalePillsProps {
  locales: readonly Locale[];
  current: Locale;
  /** Accessible names, e.g. { fr: "Français", ar: "العربية" }. */
  names: Readonly<Record<Locale, string>>;
  label: string;
  /** `scrim` over a cover photo, `surface` over the brand band. */
  tone: 'scrim' | 'surface';
}

/** The venue's languages as compact pills (ADR-0029 header controls). */
export function LocalePills({ locales, current, names, label, tone }: LocalePillsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (locales.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={pending || undefined}
      className={cn(
        'flex rounded-full p-1 shadow-sm',
        tone === 'scrim' ? 'bg-scrim/60 text-on-scrim backdrop-blur-md' : 'bg-card text-foreground',
      )}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-label={names[locale]}
            aria-pressed={active}
            disabled={pending}
            onClick={() => {
              if (active) return;
              startTransition(async () => {
                await setLocale(locale);
                router.refresh();
              });
            }}
            className={cn(
              'grid h-9 min-w-9 place-items-center rounded-full px-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors pointer-coarse:h-target pointer-coarse:min-w-target',
              active &&
                (tone === 'scrim' ? 'bg-on-scrim text-scrim' : 'bg-foreground text-background'),
            )}
          >
            {SHORT[locale]}
          </button>
        );
      })}
    </div>
  );
}
