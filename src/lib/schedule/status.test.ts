import { describe, expect, it } from 'vitest';
import { isOpenAt } from './is-open';
import { AUTO_STATUS, type Schedule } from './schema';
import { openStatusAt } from './status';

const TZ = 'Africa/Tunis';
// Mon–Fri 07:00–23:00, Saturday overnight 08:00–02:00, Sunday split 08:00–12:00 + 18:00–24:00.
const schedule: Schedule = {
  weekly: [
    ...[1, 2, 3, 4, 5].map((day) => ({
      day: day as 1 | 2 | 3 | 4 | 5,
      ranges: [{ from: '07:00', to: '23:00' }],
    })),
    { day: 6, ranges: [{ from: '08:00', to: '02:00' }] },
    {
      day: 7,
      ranges: [
        { from: '08:00', to: '12:00' },
        { from: '18:00', to: '24:00' },
      ],
    },
  ],
  exceptions: [{ date: '2026-10-15', closed: true }],
};

// Tunis is UTC+1 all year.
const at = (iso: string) => new Date(`${iso}+01:00`);

describe('openStatusAt', () => {
  it.each([
    ['2026-10-13T09:30:00', { open: true, until: '23:00' }],
    ['2026-10-13T23:00:00', { open: false, until: null }],
    ['2026-10-17T21:00:00', { open: true, until: '02:00' }],
    ['2026-10-18T01:30:00', { open: true, until: '02:00' }],
    ['2026-10-18T13:00:00', { open: false, until: null }],
    ['2026-10-18T19:00:00', { open: true, until: '00:00' }],
    ['2026-10-15T10:00:00', { open: false, until: null }],
  ])('%s → %j', (iso, expected) => {
    expect(openStatusAt(schedule, AUTO_STATUS, at(iso), TZ)).toEqual(expected);
  });

  it('agrees with isOpenAt every 30 minutes over a week', () => {
    for (let step = 0; step < 7 * 48; step += 1) {
      const instant = new Date(at('2026-10-12T00:00:00').getTime() + step * 30 * 60_000);
      expect(openStatusAt(schedule, AUTO_STATUS, instant, TZ).open).toBe(
        isOpenAt(schedule, AUTO_STATUS, instant, TZ),
      );
    }
  });

  it('lets an active manual override win, without a closing time', () => {
    const instant = at('2026-10-13T09:30:00');
    expect(openStatusAt(schedule, { status: 'closed', until: null }, instant, TZ)).toEqual({
      open: false,
      until: null,
    });
    expect(
      openStatusAt(
        schedule,
        { status: 'open', until: at('2026-10-13T10:00:00') },
        at('2026-10-13T23:30:00'),
        TZ,
      ),
    ).toEqual({ open: false, until: null });
    expect(
      openStatusAt(
        schedule,
        { status: 'open', until: at('2026-10-14T00:00:00') },
        at('2026-10-13T23:30:00'),
        TZ,
      ),
    ).toEqual({ open: true, until: null });
  });
});
