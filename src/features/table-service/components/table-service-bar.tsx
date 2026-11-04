import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { ServiceBar, type ServiceBarLabels } from './service-bar';
import type { FeedbackLabels } from './feedback-card';

const SERVICE_LABELS = [
  'region',
  'callWaiter',
  'callAgain',
  'bill',
  'sending',
  'waiterWaiting',
  'waiterClaimed',
  'billWaiting',
  'billClaimed',
  'statusWaiterWaiting',
  'statusWaiterClaimed',
  'statusBillWaiting',
  'statusBillClaimed',
  'retryIn',
  'payQuestion',
  'cash',
  'card',
  'cancel',
  'offline',
  'failed',
  'cooldown',
  'challenge',
  'blocked',
] as const satisfies readonly (keyof ServiceBarLabels)[];

/** Server half of the service bar: translated labels and public config (spec 02). */
export async function TableServiceBar({ token, locale }: { token: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'client' });
  // Templates keep `{method}` / `{time}`: the bar fills them in as state changes.
  const labels = Object.fromEntries(
    SERVICE_LABELS.map((key) => [key, t.raw(`service.${key}`) as string]),
  ) as Record<(typeof SERVICE_LABELS)[number], string>;
  const feedback: FeedbackLabels = {
    title: t('feedback.title'),
    rating: t('feedback.rating'),
    stars: [1, 2, 3, 4, 5].map((count) => t('feedback.star', { count })),
    comment: t('feedback.comment'),
    commentHint: t('feedback.commentHint'),
    send: t('feedback.send'),
    sending: t('feedback.sending'),
    later: t('feedback.later'),
    thanks: t('feedback.thanks'),
    review: t('feedback.review'),
    reviewHint: t('feedback.reviewHint'),
    failed: t('feedback.failed'),
    close: t('feedback.close'),
  };
  return (
    <ServiceBar
      token={token}
      locale={locale}
      realtime={{
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }}
      turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      labels={labels}
      feedbackLabels={feedback}
    />
  );
}
