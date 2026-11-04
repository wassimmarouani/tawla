import { describe, expect, it } from 'vitest';
import { buildSecurityHeaders } from './headers';

function directive(policy: string, name: string): string[] {
  const entry = policy.split('; ').find((part) => part.startsWith(`${name} `));
  return entry ? entry.split(' ').slice(1) : [];
}

describe('buildSecurityHeaders', () => {
  it('locks down production marketing pages', () => {
    const headers = buildSecurityHeaders({
      surface: 'marketing',
      isProduction: true,
      isHttps: true,
    });
    const csp = headers['Content-Security-Policy'] ?? '';
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'none'"]);
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-eval'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('allows same-origin framing of the customer menu (live preview)', () => {
    const headers = buildSecurityHeaders({
      surface: 'customer',
      isProduction: true,
      isHttps: true,
    });
    expect(directive(headers['Content-Security-Policy'] ?? '', 'frame-ancestors')).toEqual([
      "'self'",
    ]);
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('relaxes only what development tooling needs', () => {
    const headers = buildSecurityHeaders({ surface: 'app', isProduction: false, isHttps: false });
    const csp = headers['Content-Security-Policy'] ?? '';
    expect(directive(csp, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(csp, 'connect-src')).toContain('ws:');
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('never upgrades or pins HTTPS on a plain-http production build (local testing)', () => {
    const headers = buildSecurityHeaders({
      surface: 'customer',
      isProduction: true,
      isHttps: false,
    });
    expect(headers['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
    expect(headers['Content-Security-Policy']).not.toContain("'unsafe-eval'");
  });

  it('adds configured connect and image origins', () => {
    const csp =
      buildSecurityHeaders({
        surface: 'customer',
        isProduction: true,
        isHttps: true,
        connectSources: ['https://abc.supabase.co', 'wss://abc.supabase.co'],
        imageSources: ['https://abc.supabase.co'],
      })['Content-Security-Policy'] ?? '';
    expect(directive(csp, 'connect-src')).toEqual([
      "'self'",
      'https://abc.supabase.co',
      'wss://abc.supabase.co',
    ]);
    expect(directive(csp, 'img-src')).toContain('https://abc.supabase.co');
    expect(directive(csp, 'frame-src')).toEqual(["'self'"]);
  });

  it('allows extra script and frame origins (Turnstile on the customer menu)', () => {
    const csp =
      buildSecurityHeaders({
        surface: 'customer',
        isProduction: true,
        isHttps: true,
        scriptSources: ['https://challenges.cloudflare.com'],
        frameSources: ['https://challenges.cloudflare.com'],
      })['Content-Security-Policy'] ?? '';
    expect(directive(csp, 'script-src')).toContain('https://challenges.cloudflare.com');
    expect(directive(csp, 'frame-src')).toEqual(["'self'", 'https://challenges.cloudflare.com']);
  });
});
