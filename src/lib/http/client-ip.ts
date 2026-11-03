/**
 * Client IP for rate limits: the first `x-forwarded-for` hop (set by Vercel's edge), else
 * `x-real-ip`, else a shared bucket. Never used for anything but abuse limits.
 */
export function clientIp(headers: Pick<Headers, 'get'>): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  return 'unknown';
}
