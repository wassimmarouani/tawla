import type { Locale } from '@/i18n/locales';
import type frMessages from './fr';

/** Shape of every locale's messages; French is the reference (ADR-0026). */
export type Messages = typeof frMessages;

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  fr: () => import('./fr'),
  ar: () => import('./ar'),
  en: () => import('./en'),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  return (await loaders[locale]()).default;
}
