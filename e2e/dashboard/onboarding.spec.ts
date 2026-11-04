import path from 'node:path';
import { expect, test } from '@playwright/test';
import { emailLink } from '../fixtures/mailpit';
import { horizontalOverflow, seriousAxeViolations } from '../fixtures/quality';
import { PASSWORD, database, newOwnerWithVenue } from '../fixtures/venue';

/**
 * P1-14 acceptance: the scripted onboarding (venue and hours → identity → AI menu import →
 * tables → print → team) completes, and settings changes reach the customer menu at once.
 * AI answers come from recorded responses (playwright.config.ts).
 */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);
const PHOTO = path.resolve('src/features/ai/evals/images/cafe-printed-fr.jpg');
const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.describe.configure({ timeout: 180_000 });

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies(FRENCH);
});

test('a new owner goes from sign-in to a live menu through the setup steps', async ({
  page,
  browser,
}, testInfo) => {
  const stamp = `${testInfo.project.name}-${String(Date.now())}`;
  const venueName = `Café Démarrage ${testInfo.project.name.replace(/\D/g, '')}`;
  await newOwnerWithVenue(page, `service-onboard-${stamp}@example.org`, venueName);

  // The overview checklist leads to the setup steps.
  await page.getByRole('link', { name: /Ajouter votre carte/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/setup#menu$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mise en route' })).toBeVisible();
  expect(await seriousAxeViolations(page), 'setup axe').toEqual([]);
  expect(await horizontalOverflow(page)).toBe(0);

  // 1. Venue and hours.
  await page.locator('#venue summary').click();
  const venue = page.locator('#venue');
  await venue.getByLabel('Adresse').fill('12 avenue Habib Bourguiba, Tunis');
  await venue.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByText('Enregistré.').first()).toBeVisible();
  await venue.getByRole('checkbox', { name: 'lundi : Ouvert' }).click();
  await venue.getByRole('button', { name: 'Enregistrer' }).nth(1).click();
  await expect(page.getByText('Enregistré.').first()).toBeVisible();

  // 2. Identity: the brand colour.
  await page.locator('#branding summary').click();
  const branding = page.locator('#branding');
  await branding.getByLabel('Couleur principale').fill('#2f7d4f');
  await branding.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#branding').getByText('Fait')).toBeVisible();

  // 3. Menu from a photo (recorded AI answer).
  await page.locator('#menu').getByRole('link', { name: 'Importer depuis une photo' }).click();
  await page.locator('input[type="file"][multiple]').setInputFiles(PHOTO);
  await page.getByRole('button', { name: 'Analyser le menu' }).click();
  await page.getByRole('button', { name: 'Importer 9 plats' }).click({ timeout: 30_000 });
  await expect(page.getByText('9 plats importés.', { exact: false })).toBeVisible();

  // 4–5. Tables, then the print sheet.
  await page.goto('/dashboard/setup#tables');
  await page.locator('#tables').getByRole('link', { name: 'Créer les tables' }).click();
  await page.getByRole('button', { name: 'Créer des tables' }).click();
  const tables = page.getByRole('dialog', { name: 'Ajouter des tables' });
  await tables.getByLabel('Du numéro').fill('1');
  await tables.getByLabel('Au numéro').fill('8');
  await tables.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText('8 tables créées')).toBeVisible();
  await page.goto('/dashboard/setup#tables');
  await page.locator('#tables summary').click();
  await expect(
    page.locator('#tables').getByRole('link', { name: 'Imprimer les chevalets' }),
  ).toHaveAttribute('href', '/dashboard/tables/print?template=a6');

  // 6. Team: invite a waiter, who accepts from the email.
  await page.goto('/dashboard/team');
  const waiter = `service-onboard-waiter-${stamp}@example.org`;
  await page.getByRole('button', { name: 'Inviter' }).click();
  const invite = page.getByRole('dialog', { name: 'Inviter un membre' });
  await invite.getByLabel('Adresse e-mail').fill(waiter);
  await invite.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(page.getByText(`Invitation envoyée à ${waiter}.`)).toBeVisible();
  const link = await emailLink(waiter, '/invite/accept');
  const waiterContext = await browser.newContext();
  await waiterContext.addCookies(FRENCH);
  try {
    const invited = await waiterContext.newPage();
    await invited.goto(link);
    await invited.getByRole('button', { name: 'Rejoindre l’équipe' }).click();
    await invited.getByLabel('Nouveau mot de passe', { exact: true }).fill(PASSWORD);
    await invited.getByLabel('Confirmez le mot de passe', { exact: true }).fill(PASSWORD);
    await invited.getByRole('button', { name: 'Enregistrer et continuer' }).click();
    await expect(invited).toHaveURL(/\/staff\/pair$/);
  } finally {
    await waiterContext.close();
  }

  await page.goto('/dashboard/setup');
  await expect(page.getByText('Tout est prêt : votre menu est en ligne.')).toBeVisible();
});

test('settings changes reach the customer menu at once', async ({ page }, testInfo) => {
  const stamp = `${testInfo.project.name}-${String(Date.now())}`;
  await newOwnerWithVenue(page, `service-settings-${stamp}@example.org`, 'Café Réglages');
  const sql = database();
  let slug = '';
  try {
    const [row] = await sql<{ slug: string }[]>`
      select r.slug from public.restaurants r
      join public.memberships m on m.restaurant_id = r.id
      join auth.users u on u.id = m.user_id
      where u.email = ${`service-settings-${stamp}@example.org`}`;
    slug = row?.slug ?? '';
  } finally {
    await sql.end();
  }
  const customer = await page.context().newPage();
  await customer.goto(`/${slug}`);
  await expect(customer.getByRole('heading', { level: 1, name: 'Café Réglages' })).toBeVisible();

  await page.goto('/dashboard/settings');
  expect(await seriousAxeViolations(page), 'settings axe').toEqual([]);
  expect(await horizontalOverflow(page)).toBe(0);
  await page.getByLabel('Nom', { exact: true }).fill('Café Réglé');
  await page.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByText('Enregistré.').first()).toBeVisible();

  await page.getByLabel('Nom du Wi-Fi').fill('CafeRegle');
  await page.getByLabel('Mot de passe du Wi-Fi').fill('menta2026');
  await page.getByLabel('Instagram').fill('instagram.com/caferegle');
  const links = page.locator('form').filter({ has: page.getByLabel('Nom du Wi-Fi') });
  await links.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    links.getByText('Adresse invalide : elle doit commencer par https://'),
  ).toBeVisible();
  await page.getByLabel('Instagram').fill('https://instagram.com/caferegle');
  const toasts = await page.getByText('Enregistré.').count();
  await links.getByRole('button', { name: 'Enregistrer' }).click();
  // A new toast: this save is done (an earlier one may still be on screen).
  await expect(page.getByText('Enregistré.')).toHaveCount(toasts + 1);

  await page.getByRole('button', { name: 'Fermer maintenant' }).click();
  await expect(page.getByText('Fermé jusqu’à nouvel ordre')).toBeVisible();

  await customer.reload();
  await expect(customer.getByRole('heading', { level: 1, name: 'Café Réglé' })).toBeVisible();
  await expect(customer.getByText('Fermé', { exact: true })).toBeVisible();
  await customer.locator('summary', { hasText: 'Infos' }).click();
  await expect(customer.getByText('menta2026')).toBeVisible();
  await expect(customer.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://instagram.com/caferegle',
  );
});
