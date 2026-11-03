import { describe, expect, it } from 'vitest';
import { cooldownRemaining } from './cooldown';

const NOW = new Date('2026-11-03T12:00:00Z');
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe('cooldownRemaining', () => {
  it('is free without a previous request or after the cooldown', () => {
    expect(cooldownRemaining(null, NOW)).toBe(0);
    expect(cooldownRemaining(ago(60), NOW)).toBe(0);
    expect(cooldownRemaining(ago(600), NOW)).toBe(0);
  });

  it('rounds the remaining wait up', () => {
    expect(cooldownRemaining(ago(0), NOW)).toBe(60);
    expect(cooldownRemaining(ago(59.5), NOW)).toBe(1);
    expect(cooldownRemaining(ago(15), NOW, 30)).toBe(15);
  });

  it('treats clock skew (a future timestamp) as just now', () => {
    expect(cooldownRemaining(new Date(NOW.getTime() + 5000), NOW)).toBe(60);
  });
});
