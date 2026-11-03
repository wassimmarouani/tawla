import { expect, test, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../tooling/demo/demo';
import { openCommandPalette } from '../fixtures/dashboard';

/** Back-office shell (P1-04): sidebar or tab bar, Ctrl/Cmd + K palette, overview checklist. */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

async function logInAsOwner(page: Page, account: 'owner' | 'pizzeriaOwner' = 'owner') {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(DEMO_ACCOUNTS[account].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  const venue = account === 'owner' ? 'Café El Bahja' : 'Pizzeria Test';
  await expect(page.getByRole('heading', { level: 1, name: venue })).toBeVisible();
}

test('the overview shows the menu size and the getting-started checklist', async ({ page }) => {
  // Pizzeria Test has a menu but no tables yet: the checklist is still open.
  await logInAsOwner(page, 'pizzeriaOwner');
  await expect(page.getByRole('heading', { level: 2, name: 'Mise en route' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Mise en route' })).toBeVisible();
  await expect(page.getByText(/\d+ plats?, \d+ catégories?/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Voir le menu/ })).toHaveAttribute(
    'href',
    '/pizzeria-test',
  );
});

test('a fully set-up venue no longer shows the checklist', async ({ page }) => {
  // Café El Bahja has its menu, branding and tables (demo seed).
  await logInAsOwner(page);
  await expect(page.getByText(/\d+ plats?, \d+ catégories?/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Mise en route' })).toHaveCount(0);
});

test('the visible section navigation reaches every section and marks the current one', async ({
  page,
}) => {
  await logInAsOwner(page);
  const nav = page.getByRole('navigation', { name: 'Sections' }).filter({ visible: true });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Aperçu' })).toHaveAttribute('aria-current', 'page');

  for (const [label, path] of [
    ['Menu', '/dashboard/menu'],
    ['Tables & QR', '/dashboard/tables'],
    ['Équipe', '/dashboard/team'],
    ['Réglages', '/dashboard/settings'],
  ] as const) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});

test('Ctrl + K opens the command palette and jumps to a section', async ({ page }) => {
  await logInAsOwner(page);
  const palette = await openCommandPalette(page);
  await expect(palette).toHaveAccessibleName('Palette de commandes');
  await page.keyboard.type('équipe');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/team$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Équipe' })).toBeVisible();
  await expect(palette).toBeHidden();
});
