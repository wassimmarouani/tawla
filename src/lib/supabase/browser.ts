import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * Browser client bound to the signed-in user's auth cookies (staff app only: never imported by
 * the customer menu, ADR-0020 budget). Used for Realtime on private staff topics (ADR-0008).
 */
export function supabaseBrowser(url: string, publishableKey: string): SupabaseClient {
  client ??= createBrowserClient(url, publishableKey);
  return client;
}
