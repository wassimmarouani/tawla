import { addDays, getZonedParts, weekdayOf } from '../time/zoned';
import { rangeMinutes, type ManualStatus, type Schedule, type TimeRange } from './schema';

/** Ranges that apply to a calendar date: its exception if any, otherwise its weekday. */
function rangesFor(schedule: Schedule, date: string): readonly TimeRange[] {
  const exception = schedule.exceptions.find((entry) => entry.date === date);
  if (exception) return 'closed' in exception ? [] : exception.ranges;
  const weekday = weekdayOf(date);
  return schedule.weekly.find((entry) => entry.day === weekday)?.ranges ?? [];
}

function isOvernight(range: TimeRange): boolean {
  const { start, end } = rangeMinutes(range);
  return end < start;
}

/**
 * Whether the schedule is open at `instant` in `timeZone`.
 * Overnight ranges belong to the day they start: Saturday 18:00–02:00 keeps the venue open on
 * Sunday 01:30 even if Sunday itself is closed.
 */
export function isScheduleOpenAt(schedule: Schedule, instant: Date, timeZone: string): boolean {
  const { date, minutes } = getZonedParts(instant, timeZone);

  const openToday = rangesFor(schedule, date).some((range) => {
    const { start, end } = rangeMinutes(range);
    return isOvernight(range) ? minutes >= start : minutes >= start && minutes < end;
  });
  if (openToday) return true;

  return rangesFor(schedule, addDays(date, -1)).some(
    (range) => isOvernight(range) && minutes < rangeMinutes(range).end,
  );
}

/** Effective open status: an active manual override wins over the schedule. */
export function isOpenAt(
  schedule: Schedule,
  manual: ManualStatus,
  instant: Date,
  timeZone: string,
): boolean {
  const manualActive =
    manual.status !== 'auto' &&
    (manual.until === null || instant.getTime() < manual.until.getTime());
  if (manualActive) return manual.status === 'open';
  return isScheduleOpenAt(schedule, instant, timeZone);
}
