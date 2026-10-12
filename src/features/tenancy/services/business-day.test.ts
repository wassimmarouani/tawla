import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_CUTOFF_MINUTES, businessDate } from './business-day';
import vectors from './business-day.vectors.json';

describe('businessDate', () => {
  it.each(vectors)(
    '$instant in $timeZone (cutoff $cutoffMinutes) → $expected',
    ({ instant, timeZone, cutoffMinutes, expected }) => {
      expect(businessDate(new Date(instant), timeZone, cutoffMinutes)).toBe(expected);
    },
  );

  it('defaults to a 05:00 cutoff', () => {
    expect(DEFAULT_DAY_CUTOFF_MINUTES).toBe(300);
    expect(businessDate(new Date('2026-10-12T03:30:00Z'), 'Africa/Tunis')).toBe('2026-10-11');
  });

  it.each([-1, 1440, 2.5, Number.NaN])('rejects cutoff %s', (cutoff) => {
    expect(() => businessDate(new Date(), 'Africa/Tunis', cutoff)).toThrow(RangeError);
  });
});
