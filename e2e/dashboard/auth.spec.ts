import { expect, test, type Page } from '@playwright/test';
import { emailLink } from '../fixtures/mailpit';

/**
 * P0-11 journeys against local Supabase (pnpm db:start): sign up → confirm → dashboard,
 * log out, protected routes, password reset. The full journey runs on one phone and one
 * desktop width; route protection runs everywhere.
 */

const JOURNEY_PROJECTS = new Set(['chromium-390', 'chromium-1440']);
const PASSWORD = 'correct-horse-battery-staple';

/**
 * Visible field by label. Next.js keeps recently visited pages mounted but hidden (React
 * Activity), so the same label can exist twice in the DOM.
 */
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

function alert(page: Page, text: string) {
  return page.getByRole('alert').filter({ hasText: text });
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }]);
});

test('protected routes redirect to the login page, keeping the destination', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bon retour' })).toBeVisible();

  await page.goto('/dashboard/menu?tab=items');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fmenu%3Ftab%3Ditems$/);
});

test('wrong credentials show an error without revealing which field is wrong', async ({ page }) => {
  await page.goto('/login');
  await field(page, 'Adresse e-mail').fill(`nobody-${Date.now()}@example.org`);
  await field(page, 'Mot de passe').fill('not-the-password');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(alert(page, 'E-mail ou mot de passe incorrect.')).toBeVisible();
});

test('client-side validation speaks the UI language', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText('Champ obligatoire.').first()).toBeVisible();
  await field(page, 'Mot de passe').fill('short');
  await field(page, 'Mot de passe').blur();
  await expect(page.getByText('Au moins 10 caractères.')).toBeVisible();
});

test('owner signs up, confirms, lands on the dashboard, logs out and resets the password', async ({
  page,
}, testInfo) => {
  test.skip(!JOURNEY_PROJECTS.has(testInfo.project.name), 'Journey runs on 390 and 1440 only.');
  test.setTimeout(90_000);
  const email = `owner-${testInfo.project.name}-${Date.now()}@example.org`;
  const venue = `Café E2E ${testInfo.project.name}`;

  // Sign up: venue + account.
  await page.goto('/signup');
  await field(page, 'Nom de l’établissement').fill(venue);
  await field(page, 'Votre nom').fill('Sami Ben Ali');
  await field(page, 'Adresse e-mail').fill(email);
  await field(page, 'Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible();

  // The link only shows a button: opening it must not consume the token.
  const confirmLink = await emailLink(email, '/signup/confirm');
  await page.goto(confirmLink);
  await page.goto(confirmLink);
  await page.getByRole('button', { name: 'Activer mon compte' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: venue })).toBeVisible();
  await expect(page.getByText(/\/cafe-e2e-chromium-/)).toBeVisible();

  // Log out: protected routes redirect again.
  await page.getByRole('button', { name: 'Compte' }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);

  // Password reset: request, open the link, choose a new password, land on the dashboard.
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
  await expect(page).toHaveURL(/\/reset$/);
  await field(page, 'Adresse e-mail').fill(email);
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await expect(page.getByRole('heading', { name: 'E-mail envoyé' })).toBeVisible();

  await page.goto(await emailLink(email, '/reset/confirm'));
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/\/reset\/new$/);
  await field(page, 'Nouveau mot de passe').fill(`${PASSWORD}-2`);
  await field(page, 'Confirmez le mot de passe').fill(`${PASSWORD}-2`);
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: venue })).toBeVisible();

  // The old password no longer works; the new one does.
  await page.getByRole('button', { name: 'Compte' }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await field(page, 'Adresse e-mail').fill(email);
  await field(page, 'Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(alert(page, 'E-mail ou mot de passe incorrect.')).toBeVisible();
  await field(page, 'Mot de passe').fill(`${PASSWORD}-2`);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: venue })).toBeVisible();
});

test('an incomplete email link shows a friendly error', async ({ page }) => {
  await page.goto('/signup/confirm?token_hash=x');
  await expect(page.getByRole('heading', { level: 1, name: 'Lien incomplet' })).toBeVisible();
});
