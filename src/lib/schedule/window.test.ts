import { describe, expect, it } from 'vitest';
import { formatWeekdays, servingWindow, windowSchedule } from './window';

describe('serving windows', () => {
  it('round-trips through a schedule', () => {
    const window = { days: [6, 1, 2] as const, from: '07:00', to: '11:00' };
    const schedule = windowSchedule({ ...window, days: [...window.days] });
    expect(schedule.weekly.map((entry) => entry.day)).toEqual([1, 2, 6]);
    expect(servingWindow(schedule)).toEqual({ days: [1, 2, 6], from: '07:00', to: '11:00' });
  });

  it('is null without weekly ranges', () => {
    expect(servingWindow({ weekly: [{ day: 1, ranges: [] }], exceptions: [] })).toBeNull();
  });
});

describe('formatWeekdays', () => {
  it('returns null for every day', () => {
    expect(formatWeekdays([1, 2, 3, 4, 5, 6, 7], 'fr')).toBeNull();
  });

  it('shows consecutive days as a range', () => {
    expect(formatWeekdays([1, 2, 3, 4, 5, 6], 'fr')).toBe('lun. – sam.');
    expect(formatWeekdays([1, 2, 3, 4, 5], 'en')).toBe('Mon – Fri');
  });

  it('lists other days', () => {
    expect(formatWeekdays([5, 1, 3], 'en')).toBe('Mon, Wed, Fri');
    expect(formatWeekdays([6, 7], 'en')).toBe('Sat, Sun');
  });
});
