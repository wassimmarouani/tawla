import { createHash } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_RESTAURANTS } from '../../tooling/demo/demo';
import { seriousAxeViolations, undersizedTargets } from '../fixtures/quality';
import { database, warmUpRealtime } from '../fixtures/venue';

/**
 * P1-12 acceptance (customer context + two staff devices):
 * - a waiter call appears on the staff screen in < 2 s, measured from the ack timestamps;
 * - a claim from device 1 removes the request from device 2 immediately.
 */

const EL_BAHJA = 'b0000000-0000-4000-8000-000000000001';
const PROJECTS = new Set(['chromium-390', 'chromium-1024', 'chromium-1440']);
const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.describe.configure({ timeout: 120_000 });

test.beforeAll(async () => {
  await warmUpRealtime(DEMO_RESTAURANTS['cafe-el-bahja'].publicId);
});

test.beforeEach(({}, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Phone, tablet and desktop widths.');
});

/** A paired device signed in as `email`, past the "Start service" screen. */
async function staffDevice(browser: Browser, email: string, label: string): Promise<Page> {
  const code = Array.from({ length: 8 }, () =>
    'ABCDEFGHJKMNPQRSTVWXYZ23456789'.charAt(Math.floor(Math.random() * 30)),
  ).join('');
  const sql = database();
  try {
    await sql`
      insert into public.device_pairing_codes (restaurant_id, code_hash, label, mode, expires_at)
      values (${EL_BAHJA}, ${createHash('sha256').update(code).digest('hex')}, ${label}, 'fixed',
        now() + interval '10 minutes')`;
  } finally {
    await sql.end();
  }
  const context = await browser.newContext();
  await context.addCookies(FRENCH);
  const page = await context.newPage();
  await page.goto(`/staff/pair?code=${code}`);
  await page.getByRole('button', { name: 'Associer l’appareil' }).click();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByRole('button', { name: 'Commencer le service' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'En ligne' })).toBeVisible({
    timeout: 20_000,
  });
  return page;
}

async function freshTable() {
  const sql = database();
  try {
    for (;;) {
      const number = 100 + Math.floor(Math.random() * 899);
      const [row] = await sql<{ token: string }[]>`
        insert into public.tables (restaurant_id, number) values (${EL_BAHJA}, ${number})
        on conflict do nothing returning token`;
      if (row) return { token: row.token, number };
    }
  } finally {
    await sql.end();
  }
}

test('a call reaches two staff devices in < 2 s; a claim on one removes it from the other', async ({
  page,
  browser,
}, testInfo) => {
  const device1 = await staffDevice(
    browser,
    DEMO_ACCOUNTS.manager.email,
    `Comptoir ${testInfo.project.name}`,
  );
  const device2 = await staffDevice(
    browser,
    DEMO_ACCOUNTS.counter.email,
    `Salle ${testInfo.project.name}`,
  );
  const table = await freshTable();
  try {
    expect(await undersizedTargets(device1, 48), 'staff targets ≥ 48 px').toEqual([]);
    expect(await seriousAxeViolations(device1), 'staff live axe').toEqual([]);

    await page.context().addCookies(FRENCH);
    await page.goto(`/t/${table.token}`);
    await page.getByRole('button', { name: 'Appeler le serveur' }).click();
    await expect(page.getByText('Le personnel est prévenu.', { exact: false })).toBeVisible();

    const card = (staff: Page) =>
      staff.getByRole('listitem').filter({ hasText: `Table ${String(table.number)}` });
    await expect(card(device1)).toBeVisible({ timeout: 5000 });
    await expect(card(device2)).toBeVisible({ timeout: 5000 });
    await expect(card(device1)).toContainText('Appel serveur');

    // Latency from the acks (ADR-0007 §6): first receipt − request creation.
    const sql = database();
    try {
      await expect
        .poll(
          async () => {
            const [row] = await sql<{ seconds: number | null }[]>`
              select extract(epoch from (min(n.received_at) - r.created_at))::float as seconds
              from public.service_requests r
              join public.table_sessions s on s.id = r.table_session_id
              join public.tables t on t.id = s.table_id
              left join public.notification_receipts n on n.event_id = r.id
              where t.token = ${table.token}
              group by r.created_at`;
            return row?.seconds ?? null;
          },
          { timeout: 5000 },
        )
        .not.toBeNull();
      const [latency] = await sql<{ seconds: number }[]>`
        select extract(epoch from (min(n.received_at) - r.created_at))::float as seconds
        from public.service_requests r
        join public.table_sessions s on s.id = r.table_session_id
        join public.tables t on t.id = s.table_id
        join public.notification_receipts n on n.event_id = r.id
        where t.token = ${table.token}
        group by r.created_at`;
      expect(latency?.seconds, 'call → first ack').toBeLessThan(2);
    } finally {
      await sql.end();
    }

    // Device 1 claims: it stays there with "Done"; device 2 drops it at once.
    await card(device1).getByRole('button', { name: 'Je m’en occupe' }).click();
    await expect(card(device1)).toContainText('Vous vous en occupez');
    await expect(card(device2)).toHaveCount(0, { timeout: 2000 });
    // The customer sees the waiter coming.
    await expect(page.getByText('Un serveur a pris votre appel, il arrive.')).toBeVisible({
      timeout: 5000,
    });

    await card(device1).getByRole('button', { name: 'Terminé' }).click();
    await expect(card(device1)).toHaveCount(0);
  } finally {
    await device1.context().close();
    await device2.context().close();
    const sql = database();
    await sql`delete from public.tables where token = ${table.token}`;
    await sql.end();
  }
});

test('staff toggle availability from the live screen', async ({ browser }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-1440',
    'Hidden demo product (no public count changes); one project only.',
  );
  const device = await staffDevice(browser, DEMO_ACCOUNTS.manager.email, 'Disponibilités');
  try {
    await device.getByRole('tab', { name: 'Disponibilités' }).click();
    const toggle = device.getByRole('switch', { name: 'Thé de saison disponible' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await device.reload();
    await device.getByRole('button', { name: 'Commencer le service' }).click();
    await device.getByRole('tab', { name: 'Disponibilités' }).click();
    await expect(device.getByRole('switch', { name: 'Thé de saison disponible' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await device.getByRole('switch', { name: 'Thé de saison disponible' }).click();
    await expect(device.getByRole('switch', { name: 'Thé de saison disponible' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  } finally {
    await device.context().close();
  }
});
