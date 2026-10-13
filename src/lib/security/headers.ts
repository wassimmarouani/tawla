import type { Surface } from '../routing/resolve-route';

export interface SecurityHeaderOptions {
  surface: Surface;
  isProduction: boolean;
  /** Served over HTTPS: enables HSTS and upgrade-insecure-requests (never on http://localhost). */
  isHttps: boolean;
  /** Extra origins the browser may connect to (Supabase, Realtime websockets…). */
  connectSources?: readonly string[];
  /** Extra origins images may load from (Supabase Storage). */
  imageSources?: readonly string[];
}

/**
 * Response security headers (ADR-0017).
 *
 * Public, cached surfaces (customer menu, marketing) cannot use nonces without becoming dynamic,
 * so `script-src` allows inline scripts (Next.js inlines RSC payloads). Mitigations: no
 * dangerouslySetInnerHTML (lint), user content always rendered as text.
 * Authenticated surfaces use the same policy: under Cache Components their prerendered shells
 * cannot carry a per-request nonce (verified in P0-11, ADR-0017 amendment 2026-10-13).
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  const { isHttps, isProduction, surface } = options;
  const connect = ["'self'", ...(options.connectSources ?? [])];
  const scripts = ["'self'", "'unsafe-inline'"];
  if (!isProduction) {
    // React development builds use eval for stack reconstruction; Turbopack HMR uses websockets.
    scripts.push("'unsafe-eval'");
    connect.push('ws:');
  }

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scripts,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...(options.imageSources ?? [])],
    'font-src': ["'self'"],
    'connect-src': connect,
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': surface === 'customer' ? ["'self'"] : ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .concat(isHttps ? ['upgrade-insecure-requests'] : [])
    .join('; ');

  const headers: Record<string, string> = {
    'Content-Security-Policy': policy,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    // The customer menu is framed by the back-office live preview (same origin only).
    'X-Frame-Options': surface === 'customer' ? 'SAMEORIGIN' : 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
  if (isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  }
  return headers;
}
