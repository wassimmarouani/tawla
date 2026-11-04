import { expect, test } from '@playwright/test';
import { database } from '../fixtures/venue';

/**
 * ADR-0031: on the Menu QR plan (here a Super Admin override switching `service_requests` off),
 * the table page shows the menu only and the API refuses waiter calls.
 */

const PIZZERIA = 'b0000000-0000-4000-8000-000000000002';
const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-390', 'Shared venue override: one project.');
  await context.addCookies(FRENCH);
});

test('a venue without service requests shows the menu only', async ({ page }) => {
  const sql = database();
  const number = 900 + Math.floor(Math.random() * 99);
  const [table] = await sql<{ token: string }[]>`
    insert into public.tables (restaurant_id, number) values (${PIZZERIA}, ${number})
    returning token`;
  await sql`
    insert into public.feature_overrides (restaurant_id, feature_key, enabled, reason)
    values (${PIZZERIA}, 'service_requests', false, 'E2E menu-only')
    on conflict (restaurant_id, feature_key) do update set enabled = false`;
  try {
    await page.goto(`/t/${table?.token ?? ''}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Pizzeria Test' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Service à table' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Appeler le serveur' })).toHaveCount(0);
  } finally {
    await sql`delete from public.feature_overrides
      where restaurant_id = ${PIZZERIA} and feature_key = 'service_requests'`;
    await sql`delete from public.tables where token = ${table?.token ?? ''}`;
    await sql.end();
  }
});
