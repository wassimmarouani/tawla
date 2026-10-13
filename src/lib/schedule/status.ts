import { addDays, getZonedParts, weekdayOf } from '../time/zoned';
import { rangeMinutes, type ManualStatus, type Schedule, type TimeRange } from './schema';

export interface OpenStatus {
  open: boolean;
  /** Local closing time `HH:MM` of the current opening range; null when unknown or closed. */
  until: string | null;
}

function rangesFor(schedule: Schedule, date: string): readonly TimeRange[] {
  const exception = schedule.exceptions.find((entry) => entry.date === date);
  if (exception) return 'closed' in exception ? [] : exception.ranges;
  return schedule.weekly.find((entry) => entry.day === weekdayOf(date))?.ranges ?? [];
}

const display = (clock: string) => (clock === '24:00' ? '00:00' : clock);

/**
 * Open status for the menu header (ADR-0014): a manual override wins (no closing time shown);
 * otherwise the matching range of today, or yesterday's overnight range, gives the closing time.
 * Consistent with `isOpenAt`.
 */
export function openStatusAt(
  schedule: Schedule,
  manual: ManualStatus,
  instant: Date,
  timeZone: string,
): OpenStatus {
  const manualActive =
    manual.status !== 'auto' &&
    (manual.until === null || instant.getTime() < manual.until.getTime());
  if (manualActive) return { open: manual.status === 'open', until: null };

  const { date, minutes } = getZonedParts(instant, timeZone);
  for (const range of rangesFor(schedule, date)) {
    const { start, end } = rangeMinutes(range);
    const overnight = end < start;
    if (overnight ? minutes >= start : minutes >= start && minutes < end) {
      return { open: true, until: display(range.to) };
    }
  }
  for (const range of rangesFor(schedule, addDays(date, -1))) {
    const { start, end } = rangeMinutes(range);
    if (end < start && minutes < end) return { open: true, until: display(range.to) };
  }
  return { open: false, until: null };
}
