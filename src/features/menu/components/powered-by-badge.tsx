import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { poweredByBadgeEnabled } from '../server/flags';

/**
 * Small "Powered by Taply" badge at the bottom of the public menu (spec 02 "After service"):
 * rendered only for plans whose `powered_by_badge` feature is enabled (Menu QR, Basic). Free
 * marketing in exchange for a cheaper plan; Pro and Premium hide it.
 */
export async function PoweredByBadge({ slug }: { slug: string }) {
  const [enabled, t] = await Promise.all([
    poweredByBadgeEnabled({ slug }),
    getTranslations('client.poweredBy'),
  ]);
  if (!enabled) return null;
  return (
    <footer className="mx-auto mt-6 max-w-3xl px-gutter pb-4">
      <p className="text-center text-xs text-muted-foreground">
        {t('text')}{' '}
        <Link
          href="/"
          prefetch={false}
          className="rounded-xs font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Taply
        </Link>
      </p>
    </footer>
  );
}
