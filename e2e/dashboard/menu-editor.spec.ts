import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { localSupabase } from '../../tooling/testing/local-supabase';
import { collectConsoleErrors, seriousAxeViolations } from '../fixtures/quality';

/**
 * P1-05 acceptance: category → product with photo → reorder → unavailable → bulk +10 % with
 * preview → undo, and the public menu reflects each change on the next request.
 */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);
const PASSWORD = 'correct-horse-battery-staple';
const PHOTO = path.resolve('supabase/seed-media/citronnade.jpg');

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

async function newOwner(page: Page, label: string) {
  const email = `menu-editor-${label}-${Date.now()}@example.org`;
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
  const venue = page
    .getByLabel('Nom de l’établissement', { exact: true })
    .filter({ visible: true });
  await venue.fill(`Café Éditeur ${label}`);
  await page.getByRole('button', { name: 'Créer l’établissement' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Café Éditeur ${label}` })).toBeVisible({
    timeout: 20_000,
  });
}

async function addProduct(page: Page, name: string, price: string, photo = false) {
  await page.getByRole('link', { name: 'Ajouter un plat' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nouveau plat' })).toBeVisible();
  if (photo) {
    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(page.getByRole('button', { name: 'Changer la photo' })).toBeVisible({
      timeout: 30_000,
    });
  }
  await page.getByRole('textbox', { name: 'Nom (Français)' }).fill(name);
  await page.getByLabel('Prix').fill(price);
  await page.getByRole('button', { name: 'Ajouter le plat' }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
}

function rowNames(page: Page) {
  return page
    .getByRole('region', { name: 'Boissons' })
    .getByRole('listitem')
    .locator('span[dir="auto"]')
    .allInnerTexts();
}

test('a manager builds and edits the menu; customers see each change', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors = collectConsoleErrors(page);
  await newOwner(page, testInfo.project.name);

  // Empty menu → first category.
  await page.goto('/dashboard/menu');
  await page.getByRole('button', { name: 'Créer une catégorie' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nouvelle catégorie' });
  await dialog.getByRole('textbox', { name: 'Nom (Français)' }).fill('Boissons');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Boissons' })).toBeVisible();

  // Products, one with a photo.
  await addProduct(page, 'Thé à la menthe', '2,5', true);
  await addProduct(page, 'Café express', '1.800');
  await expect.poll(() => rowNames(page)).toEqual(['Thé à la menthe', 'Café express']);
  expect(await seriousAxeViolations(page), 'editor axe').toEqual([]);

  // Reorder with the keyboard.
  await page.getByRole('button', { name: 'Réorganiser' }).click();
  await page.getByRole('button', { name: 'Déplacer Café express' }).focus();
  // Each step waits for dnd-kit's screen reader announcement.
  await page.keyboard.press('Space');
  await expect(page.getByText('Café express en position 2 sur 2.')).toBeAttached();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByText('Café express en position 1 sur 2.')).toBeAttached();
  const reordered = page.waitForResponse((response) => response.request().method() === 'POST');
  await page.keyboard.press('Space');
  await expect(page.getByText('Café express déposé en position 1 sur 2.')).toBeAttached();
  await reordered;
  await expect.poll(() => rowNames(page)).toEqual(['Café express', 'Thé à la menthe']);
  await page.getByRole('button', { name: 'Terminé' }).click();
  await page.reload();
  await expect.poll(() => rowNames(page)).toEqual(['Café express', 'Thé à la menthe']);

  // Sold out.
  const availability = page.getByRole('switch', { name: 'Thé à la menthe disponible' });
  const saved = page.waitForResponse((response) => response.request().method() === 'POST');
  await availability.click();
  await expect(availability).toHaveAttribute('aria-checked', 'false');
  await saved;
  await page.reload();
  await expect(availability).toHaveAttribute('aria-checked', 'false');

  // Bulk +10 % with preview, then undo.
  await page.getByRole('button', { name: 'Sélectionner' }).click();
  await page.getByRole('checkbox', { name: 'Sélectionner tous les plats de Boissons' }).click();
  await page
    .getByRole('toolbar', { name: 'Actions groupées' })
    .getByRole('button', { name: 'Prix' })
    .click();
  const prices = page.getByRole('dialog', { name: 'Modifier les prix' });
  await prices.getByLabel('Variation en %').fill('10');
  await expect(prices.getByRole('cell', { name: /2,800/ })).toBeVisible();
  await expect(prices.getByRole('cell', { name: /2,000/ })).toBeVisible();
  expect(await seriousAxeViolations(page), 'price dialog axe').toEqual([]);
  await prices.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.getByText('2 prix mis à jour')).toBeVisible();
  await expect(page.getByRole('link', { name: /Thé à la menthe.*2,800/ })).toBeVisible();
  await page
    .getByRole('region', { name: /Notifications/ }) // sonner appends the hotkey
    .getByRole('button', { name: 'Annuler' })
    .click();
  await expect(page.getByText('Action annulée')).toBeVisible();
  await expect(page.getByRole('link', { name: /Thé à la menthe.*2,500/ })).toBeVisible();

  // The public menu reflects every change on the next request.
  const href = await page.getByRole('link', { name: /Voir le menu/ }).getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href ?? '/');
  await expect(page.getByRole('heading', { name: 'Boissons' })).toBeVisible();
  const items = page.getByRole('heading', { level: 3 });
  await expect(items.first()).toHaveText('Café express');
  await expect(page.getByText(/1,800/).first()).toBeVisible();

  expect(errors, 'console errors').toEqual([]);
});
