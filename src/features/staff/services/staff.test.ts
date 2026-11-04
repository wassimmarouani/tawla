import { describe, expect, it } from 'vitest';
import {
  PAIRING_ALPHABET,
  formatPairingCode,
  generatePairingCode,
  normalizePairingCode,
  pairingCodeState,
} from './pairing-code';
import { staffSessionExpiry, timeZoneOffsetMinutes } from './session-expiry';
import { staffLimitOf, staffSeatsLeft } from './staff-seats';

describe('pairing codes', () => {
  it('draws 8 unbiased characters, skipping bytes that would bias the alphabet', () => {
    const bytes = [255, 240, 0, 29, 30, 239, 1, 2, 3, 4];
    let index = 0;
    const code = generatePairingCode(() => bytes[index++] ?? 0);
    expect(code).toBe('A9A9BCDE');
    expect(code).toHaveLength(8);
    for (const char of code) expect(PAIRING_ALPHABET).toContain(char);
  });

  it('normalises typed codes and rejects anything else', () => {
    expect(normalizePairingCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizePairingCode('abcd efgh')).toBe('ABCDEFGH');
    expect(normalizePairingCode('ABCDEFG')).toBeNull();
    // Look-alikes are not in the alphabet.
    expect(normalizePairingCode('ABCDEFG0')).toBeNull();
    expect(normalizePairingCode('ABCDEFGI')).toBeNull();
    expect(formatPairingCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('expires after its deadline and works once', () => {
    const now = new Date('2026-11-03T10:00:00Z');
    const expiresAt = new Date('2026-11-03T10:10:00Z');
    expect(pairingCodeState({ expiresAt, usedAt: null }, now)).toBe('usable');
    expect(pairingCodeState({ expiresAt, usedAt: null }, expiresAt)).toBe('expired');
    expect(pairingCodeState({ expiresAt, usedAt: now }, now)).toBe('used');
  });
});

describe('staff seats', () => {
  it('counts members and pending invitations against the plan', () => {
    expect(staffSeatsLeft(1, 0, 0)).toBe(1);
    expect(staffSeatsLeft(1, 0, 1)).toBe(0);
    expect(staffSeatsLeft(1, 2, 0)).toBe(0);
    expect(staffSeatsLeft(null, 50, 3)).toBe(Number.POSITIVE_INFINITY);
  });

  it('reads the plan limit defensively', () => {
    expect(staffLimitOf({ staff: 1 })).toBe(1);
    expect(staffLimitOf({ staff: null })).toBeNull();
    expect(staffLimitOf({ staff: -1 })).toBe(0);
    expect(staffLimitOf({ staff: '3' })).toBe(0);
    expect(staffLimitOf({})).toBe(0);
    expect(staffLimitOf(null)).toBe(0);
  });
});

describe('staff session expiry', () => {
  const tunis = { timeZone: 'Africa/Tunis', dayCutoffMinutes: 5 * 60 };

  it('gives mobile devices 12 hours', () => {
    const now = new Date('2026-11-03T08:00:00Z');
    expect(staffSessionExpiry('mobile', now, tunis).toISOString()).toBe('2026-11-03T20:00:00.000Z');
  });

  it('keeps fixed devices until the next day cutoff plus grace', () => {
    // 21:00 in Tunis (UTC+1) → cutoff 05:00 local next day = 04:00Z, + 30 min.
    expect(staffSessionExpiry('fixed', new Date('2026-11-03T20:00:00Z'), tunis).toISOString()).toBe(
      '2026-11-04T04:30:00.000Z',
    );
    // 02:00 local, before today's cutoff → 05:00 local the same day.
    expect(staffSessionExpiry('fixed', new Date('2026-11-03T01:00:00Z'), tunis).toISOString()).toBe(
      '2026-11-03T04:30:00.000Z',
    );
  });

  it('reads time zone offsets', () => {
    expect(timeZoneOffsetMinutes(new Date('2026-11-03T12:00:00Z'), 'Africa/Tunis')).toBe(60);
    expect(timeZoneOffsetMinutes(new Date('2026-11-03T12:00:00Z'), 'UTC')).toBe(0);
  });
});
