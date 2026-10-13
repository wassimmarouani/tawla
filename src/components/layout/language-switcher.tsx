'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setLocale } from '@/i18n/actions';
import { LOCALES, directionOf } from '@/i18n/locales';

interface LanguageSwitcherProps {
  /** Accessible name of the control ("Language"). */
  label: string;
}

/** Compact language picker for app pages (cookie-based locale, no URL prefix). */
export function LanguageSwitcher({ label }: LanguageSwitcherProps) {
  const t = useTranslations('common.languages');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = LOCALES.map((value) => ({ value, label: t(value) }));

  return (
    <Select
      items={items}
      value={locale}
      onValueChange={(value) => {
        if (typeof value !== 'string' || value === locale) return;
        startTransition(async () => {
          await setLocale(value);
          router.refresh();
        });
      }}
      disabled={pending}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        className="gap-2 border-transparent bg-transparent shadow-none hover:bg-accent"
      >
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            lang={item.value}
            dir={directionOf(item.value)}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
