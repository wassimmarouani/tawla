/** Where a signed-in user lands by default. */
export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** Authenticated surfaces a `next` parameter may point to (ADR-0017). */
const ALLOWED_PREFIXES = ['/dashboard', '/admin', '/staff'] as const;

/**
 * Sanitizes a post-login redirect target: only same-origin paths under an authenticated surface.
 * Rejects absolute and protocol-relative URLs (`//evil.com`, `/\evil.com`), control characters
 * and anything else, so `?next=` can never become an open redirect.
 */
export function safeNextPath(candidate: unknown): string {
  if (typeof candidate !== 'string' || candidate.length > 512) return DEFAULT_AFTER_LOGIN;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return DEFAULT_AFTER_LOGIN;
  if (/[\\\s]/.test(candidate) || hasControlCharacter(candidate)) return DEFAULT_AFTER_LOGIN;

  const pathname = candidate.split(/[?#]/)[0] ?? '';
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return allowed ? candidate : DEFAULT_AFTER_LOGIN;
}

/** Login URL that returns to `from` after signing in. */
export function loginPathFor(from: string): string {
  const next = safeNextPath(from);
  return next === DEFAULT_AFTER_LOGIN ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
