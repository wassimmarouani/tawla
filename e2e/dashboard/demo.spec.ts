import { expect, test, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from '../../tooling/demo/demo';

/** Seeded demo accounts (P0-12): the back-office opens for management roles only. */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

async function logIn(page: Page, account: DemoAccount) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(DEMO_ACCOUNTS[account].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

for (const account of ['owner', 'manager'] as const) {
  test(`demo ${account} opens the Café El Bahja dashboard`, async ({ page }) => {
    await logIn(page, account);
    await expect(page.getByRole('heading', { level: 1, name: 'Café El Bahja' })).toBeVisible();
  });
}

test('demo counter account is refused the back-office', async ({ page }) => {
  await logIn(page, 'counter');
  await expect(page.getByRole('heading', { level: 1, name: 'Accès refusé' })).toBeVisible();
});

test('tenants stay apart: the pizzeria owner only sees the pizzeria', async ({ page }) => {
  await logIn(page, 'pizzeriaOwner');
  await expect(page.getByRole('heading', { level: 1, name: 'Pizzeria Test' })).toBeVisible();
  await page.context().addCookies([
    {
      name: 'tawla_restaurant',
      value: 'b0000000-0000-4000-8000-000000000001',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Accès refusé' })).toBeVisible();
});
