import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { openStatusAt, type Schedule } from '@/lib/schedule';
import { classes as cn } from '@/lib/classes';
import type { PublicMenu } from '../schemas/public-menu';

/**
 * "Open · until 23:00" for the current instant. A dynamic hole (connection()) inside the cached
 * menu page, so the menu itself stays cached while the status is always fresh.
 */
export async function OpenStatus({ restaurant }: { restaurant: PublicMenu['restaurant'] }) {
  await connection();
  const t = await getTranslations('client.status');
  const status = openStatusAt(
    restaurant.opening_schedule satisfies Schedule,
    {
      status: restaurant.manual_status,
      until: restaurant.manual_status_until ? new Date(restaurant.manual_status_until) : null,
    },
    new Date(),
    restaurant.timezone,
  );
  const label = status.open
    ? status.until
      ? t('openUntil', { time: status.until })
      : t('open')
    : t('closed');

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', status.open ? 'bg-success' : 'bg-muted-foreground')}
      />
      {label}
    </span>
  );
}
