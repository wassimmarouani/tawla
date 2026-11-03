import type { Schedule } from './schema';

/** ISO weekday: 1 = Monday … 7 = Sunday (ADR-0014). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * A simple serving window ("07:00–11:00, Monday to Saturday"): the shape the category editor
 * writes. `null` when the schedule has no weekly range.
 */
export interface ServingWindow {
  days: Weekday[];
  from: string;
  to: string;
}

export function servingWindow(schedule: Schedule): ServingWindow | null {
  const entries = schedule.weekly.filter((entry) => entry.ranges.length > 0);
  const first = entries[0]?.ranges[0];
  if (!first) return null;
  const days = WEEKDAYS.filter((day) => entries.some((entry) => entry.day === day));
  return { days, from: first.from, to: first.to };
}

export function windowSchedule(window: ServingWindow): Schedule {
  return {
    weekly: [...window.days]
      .sort((a, b) => a - b)
      .map((day) => ({ day, ranges: [{ from: window.from, to: window.to }] })),
    exceptions: [],
  };
}

/** A Monday in UTC: weekday names come from Intl, never from message files. */
const MONDAY_UTC = Date.UTC(2024, 0, 1);

/** Short weekday name in `locale` ("lun.", "Mon", "الاثنين"). */
export function weekdayName(day: Weekday, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(MONDAY_UTC + (day - 1) * 86_400_000),
  );
}

/**
 * Days as shown to people: `null` for every day (the caller prints "Every day"), a range for
 * consecutive days ("lun. – sam."), otherwise a list ("lun., mer., ven.").
 */
export function formatWeekdays(days: readonly Weekday[], locale: string): string | null {
  const sorted = WEEKDAYS.filter((day) => days.includes(day));
  if (sorted.length === WEEKDAYS.length) return null;
  const first = sorted[0];
  const last = sorted.at(-1);
  if (first === undefined || last === undefined) return '';
  const consecutive = sorted.length >= 3 && last - first + 1 === sorted.length;
  if (consecutive) return `${weekdayName(first, locale)} – ${weekdayName(last, locale)}`;
  return new Intl.ListFormat(locale, { style: 'short', type: 'unit' }).format(
    sorted.map((day) => weekdayName(day, locale)),
  );
}
