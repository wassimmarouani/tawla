import { addDays, getZonedParts } from '@/lib/time/zoned';

/** Default day boundary: 05:00 local (ADR-0013). */
export const DEFAULT_DAY_CUTOFF_MINUTES = 5 * 60;

/**
 * Business date (`YYYY-MM-DD`) of `instant` for a restaurant: the local date, shifted back one
 * day while local time is before the cutoff. Mirrored by SQL `public.business_date()`; both are
 * tested against `business-day.vectors.json`.
 */
export function businessDate(
  instant: Date,
  timeZone: string,
  cutoffMinutes: number = DEFAULT_DAY_CUTOFF_MINUTES,
): string {
  if (!Number.isInteger(cutoffMinutes) || cutoffMinutes < 0 || cutoffMinutes >= 24 * 60) {
    throw new RangeError(`Invalid day cutoff: ${String(cutoffMinutes)}`);
  }
  const local = getZonedParts(instant, timeZone);
  return local.minutes < cutoffMinutes ? addDays(local.date, -1) : local.date;
}
