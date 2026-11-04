import 'server-only';
import { z } from 'zod';
import { log } from '@/lib/log';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const siteverifySchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).default([]),
});

/**
 * Server-side check of a Turnstile token (ADR-0011 §3). Tokens are single use and expire after
 * 5 minutes. Any failure (bad token, network, unexpected body) counts as "not verified".
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | null,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const parsed = siteverifySchema.safeParse(await response.json());
    if (!parsed.success) return false;
    if (!parsed.data.success) {
      log.warn('turnstile.rejected', { errors: parsed.data['error-codes'] });
    }
    return parsed.data.success;
  } catch (error) {
    log.warn('turnstile.unreachable', { cause: String(error) });
    return false;
  }
}
