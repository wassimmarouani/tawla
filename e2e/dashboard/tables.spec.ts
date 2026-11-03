import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { localSupabase } from '../../tooling/testing/local-supabase';
import { collectConsoleErrors, seriousAxeViolations } from '../fixtures/quality';

/**
 * P1-08 acceptance: bulk-create 20 tables → print preview → PDF; the QR decoded from the
 * printed SVG matches the table URL; a regenerated token fails at once on the old URL.
 */

const PASSWORD = 'correct-horse-battery-staple';

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1440', 'PDF output needs Chromium.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

async function newOwner(page: Page) {
  const email = `tables-${Date.now()}@example.org`;
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
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
    .fill('Café QR');
  await page.getByRole('button', { name: 'Créer l’établissement' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Café QR' })).toBeVisible({
    timeout: 20_000,
  });
}

/** Decodes the QR code drawn by an SVG element from a screenshot of it. */
async function decodeQr(page: Page, index: number): Promise<string | null> {
  const svg = page.locator('svg.tent-qr').nth(index);
  const png = PNG.sync.read(await svg.screenshot());
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

test('20 tables print as tents whose QR codes open each table; regenerating kills the old QR', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectConsoleErrors(page);
  await newOwner(page);

  await page.goto('/dashboard/tables');
  await page.getByRole('button', { name: 'Créer des tables' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ajouter des tables' });
  await dialog.getByLabel('Du numéro').fill('1');
  await dialog.getByLabel('Au numéro').fill('20');
  await expect(dialog.getByText('20 tables, de 1 à 20')).toBeVisible();
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText('20 tables créées')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actions de la table 20' })).toBeVisible();
  expect(await seriousAxeViolations(page), 'tables axe').toEqual([]);

  // Taken numbers are flagged before saving.
  await page.getByRole('button', { name: 'Ajouter des tables' }).click();
  const again = page.getByRole('dialog', { name: 'Ajouter des tables' });
  await again.getByLabel('Du numéro').fill('19');
  await again.getByLabel('Au numéro').fill('22');
  await again.getByRole('button', { name: 'Créer' }).click();
  await expect(again.getByText('Déjà utilisés : 19, 20')).toBeVisible();
  await again.getByRole('button', { name: 'Annuler' }).click();

  // Print preview: 20 tents, Arabic shaped by the browser, a PDF of 20 A6 pages.
  await page.getByRole('link', { name: 'Imprimer les chevalets' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Chevalets à imprimer' })).toBeVisible();
  await expect(page.locator('.tent')).toHaveCount(20);
  await expect(page.locator('.tent-scan [lang="ar"]').first()).toHaveText(
    'امسح الرمز لرؤية القائمة',
  );
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  // The page tree's /Count is the number of pages: one A6 tent per page.
  const counts = [...pdf.toString('latin1').matchAll(/\/Count (\d+)/g)].map((match) =>
    Number(match[1]),
  );
  expect(Math.max(...counts)).toBe(20);
  // A6 (105 × 148 mm ≈ 298 × 420 pt, rounded to device pixels by Chromium).
  expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 29[78][0-9.]* 4(19|20)[0-9.]*\]/);

  // The printed QR of table 1 opens table 1.
  const url = await page.locator('svg.tent-qr').first().getAttribute('data-url');
  expect(url).toMatch(/\/t\/[A-Za-z0-9_-]{22}$/);
  expect(await decodeQr(page, 0)).toBe(url);
  await page.goto(new URL(url ?? '').pathname);
  await expect(page.getByText('Table 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Café QR' })).toBeVisible();

  // ADR-0011: opening the table menu (GET) creates no session.
  const token = new URL(url ?? '').pathname.split('/').at(-1) ?? '';
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const sessions = async () => {
    const { data } = await admin.from('tables').select('id, table_sessions(id)').eq('token', token);
    return data?.[0]?.table_sessions.length ?? -1;
  };
  expect(await sessions()).toBe(0);

  // Public API (P1-09): join the table, call the waiter once per key, then the cooldown.
  const opened = await page.request.post('/api/public/sessions', { data: { token } });
  expect(opened.status()).toBe(201);
  expect(await sessions()).toBe(1);
  const call = (key: string) =>
    page.request.post('/api/public/service-requests', {
      data: { token, kind: 'waiter' },
      headers: { 'Idempotency-Key': key },
    });
  const first = await call('e2e-key-0001');
  const replay = await call('e2e-key-0001');
  expect(first.status()).toBe(201);
  expect(((await replay.json()) as { id: string }).id).toBe(
    ((await first.json()) as { id: string }).id,
  );
  const throttled = await call('e2e-key-0002');
  expect(throttled.status()).toBe(429);
  expect(Number(throttled.headers()['retry-after'])).toBeGreaterThan(0);
  expect(((await throttled.json()) as { code: string }).code).toBe('RATE_LIMITED');

  // A new QR for table 1: the old URL fails at once.
  await page.goto('/dashboard/tables');
  await page.getByRole('button', { name: 'Actions de la table 1', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Nouveau QR code' }).click();
  await page.getByRole('button', { name: 'Générer un nouveau QR' }).click();
  await expect(page.getByText('Nouveau QR code pour la table 1.')).toBeVisible();
  await page.goto(new URL(url ?? '').pathname);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ce QR code n’est plus valide' }),
  ).toBeVisible();

  expect(errors, 'console errors').toEqual([]);
});
