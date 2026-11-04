import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { seriousAxeViolations } from '../fixtures/quality';
import { totp } from '../fixtures/totp';
import { LOCAL, PASSWORD, database, newOwnerWithVenue } from '../fixtures/venue';

/**
 * P1-15 acceptance: a platform user without `aal2` must enrol TOTP; a non-platform user gets
 * the 403 page; a flag override changes behaviour (AI quota lifted for a venue).
 */

const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1440', 'Console: one desktop width.');
  await context.addCookies(FRENCH);
});

async function logIn(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test('the console needs TOTP, refuses other users, and its overrides take effect', async ({
  page,
  browser,
}) => {
  const stamp = String(Date.now());
  // A venue whose monthly AI imports are used up.
  const ownerEmail = `service-admin-owner-${stamp}@example.org`;
  await newOwnerWithVenue(page, ownerEmail, `Café Console ${stamp.slice(-4)}`);
  const sql = database();
  try {
    await sql`
      insert into public.ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes)
      select m.restaurant_id, 'menu_import', 'gemini-2.5-flash', 1000, 300, 4
      from public.memberships m join auth.users u on u.id = m.user_id, generate_series(1, 3)
      where u.email = ${ownerEmail}`;
  } finally {
    await sql.end();
  }
  await page.goto('/dashboard/menu/import');
  await expect(page.getByText('Plus d’import ce mois-ci')).toBeVisible();

  // A signed-in owner is not platform staff.
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Accès réservé' })).toBeVisible();

  // Platform user: enrol TOTP before anything else.
  const adminEmail = `service-admin-${stamp}@example.org`;
  const admin = createClient(LOCAL.apiUrl, LOCAL.secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const promote = database();
  try {
    await promote`update public.profiles set platform_role = 'super_admin' where id = ${data.user?.id ?? ''}`;
  } finally {
    await promote.end();
  }

  const adminContext = await browser.newContext();
  await adminContext.addCookies(FRENCH);
  try {
    const adminPage = await adminContext.newPage();
    await logIn(adminPage, adminEmail, '/admin');
    await expect(adminPage).toHaveURL(/\/admin\/mfa$/);
    await adminPage.getByRole('button', { name: 'Configurer l’application' }).click();
    const secret =
      (await adminPage.locator('[data-totp-secret]').getAttribute('data-totp-secret')) ?? '';
    await expect(adminPage.getByRole('img', { name: 'QR code de configuration' })).toBeVisible();
    await adminPage.getByLabel('Code à 6 chiffres').fill(totp(secret));
    await adminPage.getByRole('button', { name: 'Valider' }).click();
    await expect(
      adminPage.getByRole('heading', { level: 1, name: 'Établissements' }),
    ).toBeVisible();
    expect(await seriousAxeViolations(adminPage), 'console axe').toEqual([]);

    // Find the venue and lift its AI quota.
    await adminPage.getByLabel('Rechercher un établissement').fill(`Console ${stamp.slice(-4)}`);
    await adminPage.getByRole('button', { name: 'Rechercher' }).click();
    await adminPage.getByRole('link', { name: `Café Console ${stamp.slice(-4)}` }).click();
    await adminPage.getByLabel('Fonction').selectOption('ai_unlimited');
    await adminPage.getByLabel('Motif').fill('Pilot onboarding');
    await adminPage.getByRole('button', { name: 'Ajouter l’option' }).click();
    await expect(adminPage.getByText('ai_unlimited · Activée')).toBeVisible();
    await expect(adminPage.getByText('platform.flag_override')).toBeVisible();
  } finally {
    await adminContext.close();
  }

  await page.goto('/dashboard/menu/import');
  await expect(page.getByText('Encore 997 imports ce mois-ci')).toBeVisible();
});
