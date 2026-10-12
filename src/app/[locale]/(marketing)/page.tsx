import { getTranslations } from 'next-intl/server';
import { env } from '@/lib/env';

// Placeholder until the marketing pages (P1-16). The locale comes from the root layout param.
export default async function HomePage() {
  const t = await getTranslations('marketing.home');

  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
        <p className="mt-3 text-lg">{t('tagline')}</p>
      </div>
    </main>
  );
}
