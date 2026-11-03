import { createClient, REALTIME_SUBSCRIBE_STATES as STATE } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
import postgres from 'postgres';

/**
 * Local Supabase for E2E journeys that need their own data. The keys are the Supabase CLI's
 * fixed development keys (not secrets), the same ones playwright.config.ts gives the app.
 */
export const LOCAL = {
  apiUrl: 'http://127.0.0.1:54321',
  publishableKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  secretKey: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
} as const;

export const PASSWORD = 'correct-horse-battery-staple';

export function database() {
  return postgres(LOCAL.databaseUrl, { onnotice: () => undefined });
}

/** Signs up an owner (admin API) and creates their venue through onboarding. */
export async function newOwnerWithVenue(page: Page, email: string, venueName: string) {
  const admin = createClient(LOCAL.apiUrl, LOCAL.secretKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page
    .getByLabel('Nom de l’établissement', { exact: true })
    .filter({ visible: true })
    .fill(venueName);
  await page.getByRole('button', { name: 'Créer l’établissement' }).click();
  await expect(page.getByRole('heading', { level: 1, name: venueName })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Realtime starts its database listener lazily on the first join, which takes seconds on a
 * cold stack. Publishes on an anonymous menu topic until a message arrives.
 */
export async function warmUpRealtime(menuPublicId: string) {
  const sql = database();
  const client = createClient(LOCAL.apiUrl, LOCAL.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const topic = `m:${menuPublicId}`;
  try {
    const received: unknown[] = [];
    const channel = client.channel(topic, { config: { private: true } });
    channel.on('broadcast', { event: 'warm.up' }, (message) => received.push(message.payload));
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === STATE.SUBSCRIBED) resolve();
        else if (status === STATE.CHANNEL_ERROR || status === STATE.TIMED_OUT) {
          reject(new Error(status));
        }
      });
    });
    const deadline = Date.now() + 30_000;
    while (received.length === 0 && Date.now() < deadline) {
      await sql`select public.broadcast(${topic}, 'warm.up', '{}'::jsonb)`;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(received.length, 'realtime warm-up').toBeGreaterThan(0);
  } finally {
    await client.removeAllChannels();
    await sql.end();
  }
}
