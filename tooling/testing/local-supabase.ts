import { execSync } from 'node:child_process';

/**
 * Connection details of the local Supabase stack (pnpm db:start), read from `supabase status`
 * so tests never hard-code keys. Test-only: the secret key never leaves the developer machine/CI.
 */
export interface LocalSupabase {
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
}

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  const output = execSync('pnpm exec supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const json = output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1);
  const status = JSON.parse(json) as Record<string, string | undefined>;
  const apiUrl = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY;
  const secretKey = status.SECRET_KEY;
  if (!apiUrl || !publishableKey || !secretKey) {
    throw new Error('Local Supabase is not running: run pnpm db:start');
  }
  cached = { apiUrl, publishableKey, secretKey };
  return cached;
}
