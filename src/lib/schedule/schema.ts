import { z } from 'zod';
import { parseClock } from '../time/zoned';

/**
 * Shared schedule format (ADR-0014) for opening hours, category availability and happy hours.
 * A range whose `to` is earlier than `from` runs overnight into the next day (18:00–02:00).
 * `24:00` is a valid end of day. Equal bounds are invalid.
 */
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Expected HH:MM');

export const timeRangeSchema = z
  .object({ from: clockSchema, to: clockSchema })
  .refine((range) => range.from !== range.to, { message: 'Range bounds must differ' })
  .refine((range) => range.from !== '24:00', { message: 'A range cannot start at 24:00' });

const dateSchema = z.iso.date();

export const scheduleSchema = z
  .object({
    weekly: z.array(
      z.object({
        day: z.literal([1, 2, 3, 4, 5, 6, 7]),
        ranges: z.array(timeRangeSchema).max(6),
      }),
    ),
    exceptions: z.array(
      z.union([
        z.object({ date: dateSchema, closed: z.literal(true) }),
        z.object({ date: dateSchema, ranges: z.array(timeRangeSchema).min(1).max(6) }),
      ]),
    ),
  })
  .refine(
    (schedule) =>
      new Set(schedule.weekly.map((entry) => entry.day)).size === schedule.weekly.length,
    {
      message: 'Each weekday may appear only once',
    },
  )
  .refine(
    (schedule) =>
      new Set(schedule.exceptions.map((entry) => entry.date)).size === schedule.exceptions.length,
    { message: 'Each exception date may appear only once' },
  );

export type TimeRange = z.infer<typeof timeRangeSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;

export const manualStatusSchema = z.object({
  status: z.enum(['auto', 'open', 'closed']),
  /** When the manual status stops applying; `null` = until changed. */
  until: z.date().nullable(),
});
export type ManualStatus = z.infer<typeof manualStatusSchema>;

export const AUTO_STATUS: ManualStatus = { status: 'auto', until: null };

/** Minutes since midnight for each bound; `end` may be ≤ `start` for overnight ranges. */
export function rangeMinutes(range: TimeRange): { start: number; end: number } {
  return { start: parseClock(range.from), end: parseClock(range.to) };
}
