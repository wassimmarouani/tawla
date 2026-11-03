import path from 'node:path';
import { expect, test } from '@playwright/test';
import { horizontalOverflow, seriousAxeViolations } from '../fixtures/quality';
import { database, newOwnerWithVenue } from '../fixtures/venue';

/**
 * P1-13 acceptance: photo → editable draft → import into the menu; missing languages
 * translated after review; quota exhaustion shows the friendly state. AI answers come from
 * recorded responses (AI_RECORDED_RESPONSES, playwright.config.ts): no network.
 */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);
const PHOTO = path.resolve('src/features/ai/evals/images/cafe-printed-fr.jpg');

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

test('imports a paper menu from a photo, then translates it', async ({ page }, testInfo) => {
  const email = `service-ai-${testInfo.project.name}-${String(Date.now())}@example.org`;
  await newOwnerWithVenue(page, email, 'Café IA');

  await page.goto('/dashboard/menu');
  await page.getByRole('link', { name: 'Importer depuis une photo' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Importer votre menu papier' }),
  ).toBeVisible();
  await expect(page.getByText('Encore 3 imports ce mois-ci')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(page.getByRole('button', { name: 'Retirer la photo 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Analyser le menu' }).click();

  await expect(page.getByRole('heading', { name: 'Vérifiez le brouillon' })).toBeVisible({
    timeout: 30_000,
  });
  expect(await seriousAxeViolations(page), 'draft axe').toEqual([]);
  expect(await horizontalOverflow(page), 'draft overflow').toBe(0);
  await page.screenshot({
    path: `test-results/review/ai-draft-${testInfo.project.name}.jpg`,
    fullPage: true,
    type: 'jpeg',
    quality: 70,
  });
  await expect(page.getByRole('textbox', { name: 'Plat' }).first()).toHaveValue('Express');
  // The owner corrects a price and drops one dish.
  await page.getByRole('checkbox', { name: 'Importer Soda' }).click();
  await page.getByRole('button', { name: 'Importer 8 plats' }).click();
  await expect(page.getByText('8 plats importés.', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Voir le menu' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  await expect(page.getByRole('link', { name: /Capucin/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Soda/ })).toHaveCount(0);

  // Translate: suggestions for the missing languages, applied after review.
  await page.getByRole('button', { name: 'Traduire le menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Traduire le menu' });
  await expect(dialog.getByRole('button', { name: /Appliquer \d+ traductions/ })).toBeVisible({
    timeout: 30_000,
  });
  await dialog.getByRole('button', { name: /Appliquer \d+ traductions/ }).click();
  await expect(page.getByText(/\d+ traductions appliquées\./)).toBeVisible();

  const sql = database();
  try {
    const [usage] = await sql<{ imports: number; items: number; cost: number }[]>`
      select count(*) filter (where u.feature = 'menu_import')::int as imports,
        coalesce(sum(u.units) filter (where u.feature = 'translation'), 0)::int as items,
        sum(u.cost_millimes)::int as cost
      from public.ai_usage u
      join public.memberships m on m.restaurant_id = u.restaurant_id
      join auth.users au on au.id = m.user_id where au.email = ${email}`;
    expect(usage?.imports).toBe(1);
    expect(usage?.items).toBeGreaterThan(0);
    expect(usage?.cost).toBeGreaterThan(0);
  } finally {
    await sql.end();
  }
});

test('a used-up import quota shows the friendly state', async ({ page }, testInfo) => {
  const email = `service-ai-quota-${testInfo.project.name}-${String(Date.now())}@example.org`;
  await newOwnerWithVenue(page, email, 'Café Quota');
  const sql = database();
  try {
    await sql`
      insert into public.ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes)
      select m.restaurant_id, 'menu_import', 'gemini-2.5-flash', 1000, 300, 4
      from public.memberships m join auth.users u on u.id = m.user_id, generate_series(1, 3)
      where u.email = ${email}`;
  } finally {
    await sql.end();
  }
  await page.goto('/dashboard/menu/import');
  await expect(page.getByText('Plus d’import ce mois-ci')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(page.getByRole('button', { name: 'Analyser le menu' })).toBeDisabled();
});
