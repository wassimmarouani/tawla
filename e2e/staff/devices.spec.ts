import { expect, test } from '@playwright/test';
import { emailLink } from '../fixtures/mailpit';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
} from '../fixtures/quality';
import { PASSWORD, newOwnerWithVenue } from '../fixtures/venue';

/**
 * P1-11 acceptance: pair a device → staff signs in → revoke from the back-office → the next staff
 * request is rejected and the screen returns to pairing; a second invitation on Basic is
 * refused; an invitation link creates the member.
 */

const PROJECTS = new Set(['chromium-390', 'chromium-1440']);
const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Runs on one phone and one desktop width.');
  await context.addCookies(FRENCH);
});

test('pairs a device, signs in on it, then revoking it sends it back to pairing', async ({
  page,
  browser,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const email = `service-pair-${testInfo.project.name}-${String(Date.now())}@example.org`;
  await newOwnerWithVenue(page, email, 'Café Appareils');

  await page.goto('/dashboard/team');
  await expect(page.getByRole('heading', { level: 1, name: 'Équipe' })).toBeVisible();
  expect(await seriousAxeViolations(page), 'team axe').toEqual([]);
  expect(await horizontalOverflow(page)).toBe(0);
  await page.getByRole('button', { name: 'Associer un appareil' }).click();
  const pairing = page.getByRole('dialog', { name: 'Associer un appareil' });
  await pairing.getByLabel('Nom de l’appareil').fill('Tablette comptoir');
  await pairing.getByRole('radio', { name: /Fixe/ }).check();
  await pairing.getByRole('button', { name: 'Obtenir le code' }).click();
  const shown = page.getByRole('dialog', { name: 'Code d’association' });
  await expect(shown.getByRole('img', { name: 'QR code d’association' })).toBeVisible();
  const code = (await shown.locator('[data-pairing-code]').getAttribute('data-pairing-code')) ?? '';
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  expect(await seriousAxeViolations(page), 'pairing dialog axe').toEqual([]);
  await shown.getByRole('button', { name: 'Terminé' }).click();

  // The device: pairing, then sign-in, then the staff home.
  const deviceContext = await browser.newContext();
  await deviceContext.addCookies(FRENCH);
  try {
    const device = await deviceContext.newPage();
    await device.goto('/staff');
    await expect(device).toHaveURL(/\/staff\/pair$/);
    await device.getByLabel('Code d’association').fill(`${code.slice(0, 4)}-${code.slice(4)}`);
    await device.getByRole('button', { name: 'Associer l’appareil' }).click();
    await expect(device).toHaveURL(/\/staff\/login$/);
    await expect(
      device.getByText('Appareil « Tablette comptoir » de Café Appareils.'),
    ).toBeVisible();
    await device.getByLabel('Adresse e-mail', { exact: true }).fill(email);
    await device.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
    await device.getByRole('button', { name: 'Se connecter' }).click();
    await expect(device.getByRole('heading', { name: 'Commencer le service' })).toBeVisible();
    expect((await device.request.get('/api/staff/me')).status()).toBe(200);
    expect(await seriousAxeViolations(device), 'staff home axe').toEqual([]);

    // The code worked once.
    await page.reload();
    await expect(page.getByText('Tablette comptoir', { exact: true })).toBeVisible();
    const session = page.getByRole('button', { name: `Déconnecter ${email}` });
    await expect(session).toBeVisible();

    // Revoke: the next staff request is refused, the screen returns to pairing.
    await page
      .getByRole('group', { name: 'Actions de l’appareil Tablette comptoir' })
      .getByRole('button', { name: 'Retirer' })
      .click();
    await page
      .getByRole('dialog', { name: 'Retirer « Tablette comptoir » ?' })
      .getByRole('button', { name: 'Retirer l’appareil' })
      .click();
    await expect(page.getByText('Appareil retiré.')).toBeVisible();
    const me = await device.request.get('/api/staff/me');
    expect(me.status()).toBe(401);
    expect(((await me.json()) as { code: string }).code).toBe('DEVICE_NOT_PAIRED');
    await device.reload();
    await expect(device).toHaveURL(/\/staff\/pair$/);
    await expect(page.getByText('Personne n’est connecté sur un appareil.')).toBeVisible();
  } finally {
    await deviceContext.close();
  }
  expect(errors).toEqual([]);
});

test('Basic invites one member; the link creates them; a second invitation is refused', async ({
  page,
  browser,
}, testInfo) => {
  const stamp = `${testInfo.project.name}-${String(Date.now())}`;
  await newOwnerWithVenue(page, `service-invite-${stamp}@example.org`, 'Café Équipe');
  const waiter = `service-waiter-${stamp}@example.org`;

  await page.goto('/dashboard/team');
  await expect(page.getByText('Encore 1 place dans votre formule')).toBeVisible();
  await page.getByRole('button', { name: 'Inviter' }).click();
  const invite = page.getByRole('dialog', { name: 'Inviter un membre' });
  await invite.getByLabel('Adresse e-mail').fill(waiter);
  await invite.getByRole('radio', { name: /Serveur/ }).check();
  await invite.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(page.getByText(`Invitation envoyée à ${waiter}.`)).toBeVisible();
  await expect(page.getByText('Plus de place dans votre formule')).toBeVisible();

  await page.getByRole('button', { name: 'Inviter' }).click();
  const second = page.getByRole('dialog', { name: 'Inviter un membre' });
  await second.getByLabel('Adresse e-mail').fill(`service-second-${stamp}@example.org`);
  await second.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(
    page.getByText('Votre formule Basic inclut un seul membre en plus de vous.', { exact: false }),
  ).toBeVisible();
  await second.getByRole('button', { name: 'Annuler' }).click();

  // The invited waiter follows the email link, sets a password and lands on the staff app.
  const link = await emailLink(waiter, '/invite/accept');
  const waiterContext = await browser.newContext();
  await waiterContext.addCookies(FRENCH);
  try {
    const invited = await waiterContext.newPage();
    await invited.goto(link);
    await invited.getByRole('button', { name: 'Rejoindre l’équipe' }).click();
    await expect(invited).toHaveURL(/\/reset\/new$/);
    await invited.getByLabel('Nouveau mot de passe', { exact: true }).fill(PASSWORD);
    await invited.getByLabel('Confirmez le mot de passe', { exact: true }).fill(PASSWORD);
    await invited.getByRole('button', { name: 'Enregistrer et continuer' }).click();
    // A waiter works on the staff app; this browser is not a paired device yet.
    await expect(invited).toHaveURL(/\/staff\/pair$/);
  } finally {
    await waiterContext.close();
  }
  await page.reload();
  await expect(page.getByText(waiter, { exact: true })).toBeVisible();
  await expect(page.getByText('Invitation envoyée', { exact: true })).toHaveCount(0);
});
