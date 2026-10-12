import { describe, expect, it } from 'vitest';
import { resolveRoute } from './resolve-route';

describe('resolveRoute', () => {
  it.each(['/', '/pricing', '/legal/terms', '/ar', '/en/pricing', '/fr/legal/privacy'])(
    'sends %s through next-intl marketing routing',
    (pathname) => {
      expect(resolveRoute(pathname, 'ar')).toEqual({ kind: 'marketing', surface: 'marketing' });
    },
  );

  it.each([
    ['/t/abc123', 'customer', '/ar/t/abc123'],
    ['/r/cafe-el-bahja', 'customer', '/ar/r/cafe-el-bahja'],
    ['/dashboard', 'app', '/ar/dashboard'],
    ['/dashboard/menu/items', 'app', '/ar/dashboard/menu/items'],
    ['/staff/live', 'app', '/ar/staff/live'],
    ['/admin', 'app', '/ar/admin'],
    ['/login', 'app', '/ar/login'],
    ['/dev/directions/a', 'app', '/ar/dev/directions/a'],
  ] as const)('rewrites %s (%s) to %s', (pathname, surface, rewritten) => {
    expect(resolveRoute(pathname, 'ar')).toEqual({ kind: 'rewrite', surface, pathname: rewritten });
  });

  it.each([
    ['/cafe-el-bahja', '/fr/r/cafe-el-bahja'],
    ['/cafe-el-bahja/p/capucin', '/fr/r/cafe-el-bahja/p/capucin'],
    ['/unknown', '/fr/r/unknown'],
  ])('treats %s as a restaurant slug', (pathname, rewritten) => {
    expect(resolveRoute(pathname, 'fr')).toEqual({
      kind: 'rewrite',
      surface: 'customer',
      pathname: rewritten,
    });
  });
});
