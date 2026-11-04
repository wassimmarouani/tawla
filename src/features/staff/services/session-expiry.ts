/**
 * Staff session lifetime (ADR-0010 §6): `mobile` devices 12 h; `fixed` devices until the end of
 * the business day (the restaurant's day cutoff, e.g. 05:00 local) plus 30 minutes' grace.
 */
export const MOBILE_SESSION_HOURS = 12;
export const FIXED_GRACE_MINUTES = 30;

/** Offset of `timeZone` from UTC at `at`, in minutes (e.g. +60 for Africa/Tunis). */
export function timeZoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const wall = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

export function staffSessionExpiry(
  mode: 'fixed' | 'mobile',
  now: Date,
  restaurant: { timeZone: string; dayCutoffMinutes: number },
): Date {
  if (mode === 'mobile') return new Date(now.getTime() + MOBILE_SESSION_HOURS * 3_600_000);
  const offset = timeZoneOffsetMinutes(now, restaurant.timeZone) * 60_000;
  // Work in "local wall time expressed as UTC", then shift back.
  const local = new Date(now.getTime() + offset);
  const cutoff = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) +
      restaurant.dayCutoffMinutes * 60_000,
  );
  if (cutoff.getTime() <= local.getTime()) cutoff.setUTCDate(cutoff.getUTCDate() + 1);
  return new Date(cutoff.getTime() - offset + FIXED_GRACE_MINUTES * 60_000);
}
