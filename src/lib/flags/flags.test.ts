import { describe, expect, it } from 'vitest';
import { FEATURE_KEYS, isEnabled, resolveFlags, type FlagInputs } from '.';

const NOW = new Date('2026-10-12T10:00:00Z');
const basic: FlagInputs = {
  planFeatures: ['menu', 'branding', 'service_requests', 'ai_translate'],
  overrides: [],
  restaurantSettings: {},
};

describe('isEnabled', () => {
  it('follows the plan by default', () => {
    expect(isEnabled('menu', basic, NOW)).toBe(true);
    expect(isEnabled('ordering', basic, NOW)).toBe(false);
  });

  it('applies active overrides in both directions', () => {
    const inputs: FlagInputs = {
      ...basic,
      overrides: [
        { key: 'ordering', enabled: true, expiresAt: new Date('2026-10-20T00:00:00Z') },
        { key: 'ai_translate', enabled: false, expiresAt: null },
      ],
    };
    expect(isEnabled('ordering', inputs, NOW)).toBe(true);
    expect(isEnabled('ai_translate', inputs, NOW)).toBe(false);
  });

  it('ignores expired overrides', () => {
    const inputs: FlagInputs = {
      ...basic,
      overrides: [{ key: 'ordering', enabled: true, expiresAt: NOW }],
    };
    expect(isEnabled('ordering', inputs, NOW)).toBe(false);
  });

  it('lets restaurant settings disable but never grant', () => {
    expect(
      isEnabled(
        'service_requests',
        { ...basic, restaurantSettings: { service_requests: false } },
        NOW,
      ),
    ).toBe(false);
    expect(isEnabled('ordering', { ...basic, restaurantSettings: { ordering: true } }, NOW)).toBe(
      false,
    );
  });
});

describe('resolveFlags', () => {
  it('resolves every known key', () => {
    const flags = resolveFlags(basic, NOW);
    expect(Object.keys(flags).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(flags.menu).toBe(true);
    expect(flags.kitchen_display).toBe(false);
  });
});
