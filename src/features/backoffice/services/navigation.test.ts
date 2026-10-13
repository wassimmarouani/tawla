import { describe, expect, it } from 'vitest';
import { activeNavKey, dashboardNavigation } from './navigation';

describe('dashboardNavigation', () => {
  it('gives owners and managers every section', () => {
    for (const role of ['owner', 'manager'] as const) {
      expect(dashboardNavigation(role).map((item) => item.key)).toEqual([
        'overview',
        'menu',
        'tables',
        'team',
        'settings',
      ]);
    }
  });

  it('gives floor roles nothing (they use the staff app)', () => {
    for (const role of ['counter', 'waiter', 'station'] as const) {
      expect(dashboardNavigation(role)).toEqual([]);
    }
  });
});

describe('activeNavKey', () => {
  const items = dashboardNavigation('owner');

  it.each([
    ['/dashboard', 'overview'],
    ['/dashboard/menu', 'menu'],
    ['/dashboard/menu/products/new', 'menu'],
    ['/dashboard/settings', 'settings'],
    ['/dashboard/menuish', 'overview'],
    ['/login', null],
  ])('%s → %s', (pathname, expected) => {
    expect(activeNavKey(items, pathname)).toBe(expected);
  });
});
