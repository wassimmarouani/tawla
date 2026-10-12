import { describe, expect, it } from 'vitest';
import { addDays, getZonedParts, parseClock, weekdayOf } from './zoned';

describe('getZonedParts', () => {
  it('returns local wall-clock parts in Africa/Tunis (UTC+1, no DST)', () => {
    expect(getZonedParts(new Date('2026-10-12T03:30:00Z'), 'Africa/Tunis')).toEqual({
      date: '2026-10-12',
      weekday: 1,
      minutes: 4 * 60 + 30,
    });
    expect(getZonedParts(new Date('2026-10-11T23:15:00Z'), 'Africa/Tunis')).toEqual({
      date: '2026-10-12',
      weekday: 1,
      minutes: 15,
    });
  });

  it('follows DST in zones that have it', () => {
    expect(getZonedParts(new Date('2026-07-01T10:00:00Z'), 'Europe/Paris').minutes).toBe(12 * 60);
    expect(getZonedParts(new Date('2026-12-01T10:00:00Z'), 'Europe/Paris').minutes).toBe(11 * 60);
  });

  it('rejects unknown time zones', () => {
    expect(() => getZonedParts(new Date(), 'Mars/Olympus')).toThrow(RangeError);
  });
});

describe('calendar helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-12', -1)).toBe('2026-10-11');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });

  it('computes ISO weekdays', () => {
    expect(weekdayOf('2026-10-12')).toBe(1);
    expect(weekdayOf('2026-10-18')).toBe(7);
    expect(() => weekdayOf('2026-xx-01')).toThrow(RangeError);
    expect(() => weekdayOf('2026-02-30')).toThrow(RangeError);
  });

  it('parses clock times including 24:00', () => {
    expect(parseClock('00:00')).toBe(0);
    expect(parseClock('07:30')).toBe(450);
    expect(parseClock('24:00')).toBe(1440);
    for (const bad of ['24:01', '7:30', '25:00', '12:60', '']) {
      expect(() => parseClock(bad)).toThrow(RangeError);
    }
  });
});
