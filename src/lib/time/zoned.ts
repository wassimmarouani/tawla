/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ZonedParts {
  /** Local calendar date `YYYY-MM-DD`. */
  date: string;
  weekday: IsoWeekday;
  /** Minutes since local midnight, 0–1439. */
  minutes: number;
}

const WEEKDAYS: Record<string, IsoWeekday> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock date, weekday and minutes of `instant` in `timeZone` (DST-aware via Intl). */
export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Map(
    formatterFor(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value] as const),
  );
  const weekday = WEEKDAYS[parts.get('weekday') ?? ''];
  if (!weekday) throw new RangeError(`Cannot resolve weekday for time zone ${timeZone}`);
  return {
    date: `${String(parts.get('year'))}-${String(parts.get('month'))}-${String(parts.get('day'))}`,
    weekday,
    minutes: Number(parts.get('hour')) * 60 + Number(parts.get('minute')),
  };
}

/** Parses a strict `YYYY-MM-DD` calendar date into a UTC midnight Date. */
function utcMidnight(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const utc = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (utc?.toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid date: ${date}`);
  }
  return utc;
}

/** Adds `days` to a `YYYY-MM-DD` calendar date (pure calendar arithmetic, no time zone). */
export function addDays(date: string, days: number): string {
  const utc = utcMidnight(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** ISO weekday of a `YYYY-MM-DD` calendar date. */
export function weekdayOf(date: string): IsoWeekday {
  const utcDay = utcMidnight(date).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as IsoWeekday;
}

/** Parses `HH:MM` (00:00–24:00) into minutes since midnight. */
export function parseClock(value: string): number {
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(value);
  if (!match) throw new RangeError(`Invalid clock time: ${value}`);
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes > 24 * 60) throw new RangeError(`Invalid clock time: ${value}`);
  return minutes;
}
