import { useTranslations } from 'next-intl';

// Polished design arrives with the design system (P0-07); this establishes the localized state.
export default function LocaleNotFound() {
  const t = useTranslations('common.notFound');
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-3">{t('description')}</p>
      </div>
    </main>
  );
}
