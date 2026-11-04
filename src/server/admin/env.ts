import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { StorageConfig } from './media/storage';

/**
 * Privileged server secrets (ADR-0003, docs/setup.md): readable only from src/server/admin.
 * Parsed on first use, so routes that never need them do not require them.
 */
const adminEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  /** Web Push (ADR-0022): both optional, push is disabled without them. */
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

let cached: z.infer<typeof adminEnvSchema> | undefined;

export function adminEnv(): z.infer<typeof adminEnvSchema> {
  cached ??= adminEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });
  return cached;
}

/** Storage access for the media pipeline (ADR-0018). */
export function storageConfig(): StorageConfig {
  return { apiUrl: env.NEXT_PUBLIC_SUPABASE_URL, secretKey: adminEnv().SUPABASE_SECRET_KEY };
}
