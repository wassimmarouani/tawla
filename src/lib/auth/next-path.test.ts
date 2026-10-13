import { describe, expect, it } from 'vitest';
import { DEFAULT_AFTER_LOGIN, loginPathFor, safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it.each([
    '/dashboard',
    '/dashboard/menu',
    '/dashboard/menu?tab=items#top',
    '/admin',
    '/staff/requests',
  ])('keeps the authenticated path %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'dashboard',
    'https://evil.example/dashboard',
    '//evil.example/dashboard',
    '/\\evil.example',
    '/dashboard\\..\\x',
    '/dashboard evil',
    '/dashboard\nSet-Cookie:x',
    '/dashboardx',
    '/login',
    '/t/abc',
    `/dashboard/${'a'.repeat(600)}`,
  ])('falls back to the dashboard for %j', (candidate) => {
    expect(safeNextPath(candidate)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('rejects other control characters', () => {
    expect(safeNextPath(`/dashboard${String.fromCharCode(0)}`)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath(`/dashboard${String.fromCharCode(0x7f)}`)).toBe(DEFAULT_AFTER_LOGIN);
  });
});

describe('loginPathFor', () => {
  it('omits the default destination', () => {
    expect(loginPathFor('/dashboard')).toBe('/login');
    expect(loginPathFor('//evil.example')).toBe('/login');
  });

  it('encodes a deeper destination', () => {
    expect(loginPathFor('/dashboard/menu?tab=items')).toBe(
      '/login?next=%2Fdashboard%2Fmenu%3Ftab%3Ditems',
    );
  });
});
