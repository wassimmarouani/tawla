import { describe, expect, it } from 'vitest';
import {
  AUTO_STATUS,
  isOpenAt,
  isScheduleOpenAt,
  manualStatusSchema,
  scheduleSchema,
  type Schedule,
} from '.';

const TZ = 'Africa/Tunis'; // UTC+1
/** Local Tunis wall-clock time → instant. */
const at = (local: string) => new Date(`${local}:00+01:00`);

// 2026-10-12 is a Monday. Café: Mon–Fri 07:00–23:00, Sat 08:00–02:00 (overnight), Sun closed.
const cafe: Schedule = scheduleSchema.parse({
  weekly: [
    ...[1, 2, 3, 4, 5].map((day) => ({ day, ranges: [{ from: '07:00', to: '23:00' }] })),
    { day: 6, ranges: [{ from: '08:00', to: '02:00' }] },
    { day: 7, ranges: [] },
  ],
  exceptions: [
    { date: '2026-10-15', closed: true },
    {
      date: '2026-10-16',
      ranges: [
        { from: '12:00', to: '15:00' },
        { from: '18:00', to: '24:00' },
      ],
    },
  ],
});

describe('isScheduleOpenAt', () => {
  it.each([
    ['2026-10-12T06:59', false],
    ['2026-10-12T07:00', true],
    ['2026-10-12T22:59', true],
    ['2026-10-12T23:00', false],
    ['2026-10-17T07:59', false],
    ['2026-10-17T23:30', true],
    // Saturday's overnight range spills into closed Sunday until 02:00.
    ['2026-10-18T01:59', true],
    ['2026-10-18T02:00', false],
    ['2026-10-18T12:00', false],
    // Thursday exception: closed all day.
    ['2026-10-15T10:00', false],
    // Friday exception: split service, open until midnight.
    ['2026-10-16T11:00', false],
    ['2026-10-16T13:00', true],
    ['2026-10-16T16:00', false],
    ['2026-10-16T23:59', true],
  ])('%s → %s', (local, expected) => {
    expect(isScheduleOpenAt(cafe, at(local), TZ)).toBe(expected);
  });

  it('closes exactly at midnight for a range ending at 00:00', () => {
    const lateNight = scheduleSchema.parse({
      weekly: [{ day: 1, ranges: [{ from: '20:00', to: '00:00' }] }],
      exceptions: [],
    });
    expect(isScheduleOpenAt(lateNight, at('2026-10-12T23:30'), TZ)).toBe(true);
    expect(isScheduleOpenAt(lateNight, at('2026-10-13T00:10'), TZ)).toBe(false);
  });
});

describe('isOpenAt (manual override)', () => {
  const monday10 = at('2026-10-12T10:00');
  const sunday10 = at('2026-10-18T10:00');

  it('follows the schedule in auto mode', () => {
    expect(isOpenAt(cafe, AUTO_STATUS, monday10, TZ)).toBe(true);
    expect(isOpenAt(cafe, AUTO_STATUS, sunday10, TZ)).toBe(false);
  });

  it('"close now" wins until it expires', () => {
    const manual = { status: 'closed' as const, until: at('2026-10-12T12:00') };
    expect(isOpenAt(cafe, manual, monday10, TZ)).toBe(false);
    expect(isOpenAt(cafe, manual, at('2026-10-12T12:00'), TZ)).toBe(true);
  });

  it('manual open without expiry overrides a closed day', () => {
    expect(isOpenAt(cafe, { status: 'open', until: null }, sunday10, TZ)).toBe(true);
  });
});

describe('scheduleSchema validation', () => {
  const valid = { weekly: [], exceptions: [] };

  it.each([
    [{ ...valid, weekly: [{ day: 8, ranges: [] }] }],
    [{ ...valid, weekly: [{ day: 1, ranges: [{ from: '10:00', to: '10:00' }] }] }],
    [{ ...valid, weekly: [{ day: 1, ranges: [{ from: '24:00', to: '02:00' }] }] }],
    [{ ...valid, weekly: [{ day: 1, ranges: [{ from: '9:00', to: '12:00' }] }] }],
    [
      {
        ...valid,
        weekly: [
          { day: 1, ranges: [] },
          { day: 1, ranges: [] },
        ],
      },
    ],
    [{ ...valid, exceptions: [{ date: '2026-02-30', closed: true }] }],
    [
      {
        ...valid,
        exceptions: [
          { date: '2026-10-15', closed: true },
          { date: '2026-10-15', closed: true },
        ],
      },
    ],
  ])('rejects %j', (input) => {
    expect(scheduleSchema.safeParse(input).success).toBe(false);
  });

  it('accepts a full-day range and validates manual status', () => {
    expect(
      scheduleSchema.safeParse({
        weekly: [{ day: 7, ranges: [{ from: '00:00', to: '24:00' }] }],
        exceptions: [],
      }).success,
    ).toBe(true);
    expect(manualStatusSchema.safeParse({ status: 'paused', until: null }).success).toBe(false);
  });
});
