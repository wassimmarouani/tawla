import type { ElementType } from 'react';
import { directionOf, type Locale } from '@/i18n/locales';
import type { LocalizedText } from '../schemas/public-menu';

interface LocalizedProps {
  value: LocalizedText;
  /** Page language; fallback text in another language gets its own `lang` and `dir`. */
  locale: Locale;
  as?: ElementType;
  className?: string;
}

/** Menu text with the ADR-0026 fallback marked up (correct font, direction and speech). */
export function Localized({ value, locale, as: Tag = 'span', className }: LocalizedProps) {
  const foreign = value.lang !== locale;
  return (
    <Tag
      className={className}
      lang={foreign ? value.lang : undefined}
      dir={foreign ? directionOf(value.lang) : undefined}
    >
      {value.text}
    </Tag>
  );
}
