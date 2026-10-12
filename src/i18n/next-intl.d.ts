import type { Messages } from '@/messages';
import type { Locale } from './locales';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
