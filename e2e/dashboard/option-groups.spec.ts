import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { localSupabase } from '../../tooling/testing/local-supabase';
import { collectConsoleErrors, seriousAxeViolations } from '../fixtures/quality';

/**
 * P1-06 acceptance: a "Size" group linked to a coffee (+1.500) and a juice (+2.000 override);
 * the live preview shows "from" prices; min > max is rejected inline.
 */

const PASSWORD = 'correct-horse-battery-staple';

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1440', 'The live preview shows from 1280 px.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

async function newOwner(page: Page) {
  const email = `option-groups-${Date.now()}@example.org`;
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
    .fill('Café Options');
  await page.getByRole('button', { name: 'Créer l’établissement' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Café Options' })).toBeVisible({
    timeout: 20_000,
  });
}

async function addProduct(page: Page, name: string, price: string, override?: string) {
  await page.goto('/dashboard/menu');
  await page.getByRole('link', { name: 'Ajouter un plat' }).click();
  await page.getByRole('textbox', { name: 'Nom (Français)' }).fill(name);
  await page.getByLabel('Prix', { exact: true }).fill(price);
  await page.getByRole('combobox', { name: 'Ajouter un groupe' }).click();
  await page.getByRole('option', { name: 'Taille' }).click();
  await expect(page.getByText('Obligatoire · 1 choix')).toBeVisible();
  if (override) {
    await page.getByRole('button', { name: 'Adapter pour ce plat' }).click();
    await page.getByLabel('Prix de Grand').fill(override);
  }
  const saved = page.waitForURL(/\/dashboard\/menu\?focus=/);
  await page.getByRole('button', { name: 'Ajouter le plat' }).click();
  await saved;
}

test('a shared Size group prices each product; the preview shows "from" prices', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectConsoleErrors(page);
  await newOwner(page);

  await page.goto('/dashboard/menu');
  await page.getByRole('button', { name: 'Nouvelle catégorie' }).click();
  const category = page.getByRole('dialog', { name: 'Nouvelle catégorie' });
  await category.getByRole('textbox', { name: 'Nom (Français)' }).fill('Boissons');
  await category.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Boissons' })).toBeVisible();

  // The group: min > max is rejected inline, then fixed.
  await page.getByRole('link', { name: 'Groupes d’options' }).click();
  await page.getByRole('button', { name: 'Créer un groupe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau groupe d’options' });
  await dialog.getByLabel('Nom du groupe').fill('Taille');
  await dialog.getByLabel('Choix minimum').fill('2');
  await dialog.getByLabel('Choix maximum').fill('1');
  await dialog.getByLabel('Nom de l’option 1').fill('Normal');
  await dialog.getByLabel('Nom de l’option 2').fill('Grand');
  await dialog.getByLabel('Supplément de l’option 2').fill('1,5');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(
    dialog.getByText('Le maximum doit être supérieur ou égal au minimum.'),
  ).toBeVisible();
  expect(await seriousAxeViolations(page), 'option dialog axe').toEqual([]);
  await dialog.getByLabel('Choix minimum').fill('1');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Taille' })).toBeVisible();
  await expect(page.getByText('+1,500 DT')).toBeVisible();

  // Linked to a coffee as is, and to a juice with a +2.000 override.
  await addProduct(page, 'Café crème', '2,5');
  // Next.js keeps the previous page hidden (Activity): only the visible preview counts.
  const preview = page.getByRole('complementary', { name: 'Aperçu client' }).frameLocator('iframe');
  await expect(preview.getByRole('dialog').getByText('Café crème').first()).toBeVisible();
  await addProduct(page, 'Jus d’orange', '5', '2');

  // The live preview shows "from" prices on the menu.
  await expect(preview.getByText('À partir de 2,500 DT').first()).toBeVisible({ timeout: 15_000 });
  await expect(preview.getByText('À partir de 5,000 DT').first()).toBeVisible();
  await expect(page.getByText('Utilisé par 2 plats')).toBeHidden();
  await page.getByRole('link', { name: 'Groupes d’options' }).click();
  await expect(page.getByText('Utilisé par 2 plats')).toBeVisible();

  expect(errors, 'console errors').toEqual([]);
});
