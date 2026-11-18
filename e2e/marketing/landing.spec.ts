import { expect, test } from '@playwright/test';
import { horizontalOverflow, seriousAxeViolations, undersizedTargets } from '../fixtures/quality';

/**
 * P1-16 acceptance: the marketing home, pricing (from the plan catalogue) and legal drafts in
 * French and Arabic, the language menu, and the live demo on large screens.
 */

const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.beforeEach(async ({ context }) => {
  await context.addCookies(FRENCH);
});

test('the home page explains the product and leads to sign-up', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Votre menu en QR code, prêt en 30 minutes.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Créer mon menu' }).first()).toHaveAttribute(
    'href',
    '/signup',
  );
  await expect(
    page.getByRole('link', { name: 'Nous écrire sur WhatsApp' }).first(),
  ).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+$/);

  // FAQ answers fold out. Scroll the summary into view first — WebKit iPhone intermittently
  // reports the element "not stable" otherwise because the page is still animating in.
  const faqTrigger = page.getByText('Mes clients doivent-ils installer une application ?');
  await faqTrigger.scrollIntoViewIfNeeded();
  await faqTrigger.click();
  await expect(page.getByText('Non. Ils scannent le QR code', { exact: false })).toBeVisible();

  const wide = (page.viewportSize()?.width ?? 0) >= 1024;
  if (wide) {
    // The live demo menu runs in the phone frame, next to its QR code.
    const demo = page.frameLocator('iframe[title="Menu de démonstration"]');
    await expect(demo.getByRole('heading', { level: 1, name: 'Café El Bahja' })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      await expect(
        page.getByRole('img', { name: 'QR code du menu de démonstration' }),
      ).toBeVisible();
    }
  } else {
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Voir le menu de démonstration' })).toHaveAttribute(
      'href',
      '/cafe-el-bahja',
    );
  }

  expect(await horizontalOverflow(page), 'horizontal overflow').toBeLessThanOrEqual(0);
  if (testInfo.project.name.startsWith('chromium')) {
    expect(await undersizedTargets(page), 'targets').toEqual([]);
    expect(await seriousAxeViolations(page), 'axe').toEqual([]);
  }
  // The call to action opens the sign-up form (another surface: no locale prefix).
  await page.getByRole('main').getByRole('link', { name: 'Créer mon menu' }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Créez votre menu digital' }),
  ).toBeVisible();
});

test('the language menu switches the URL prefix and direction', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('navigation', { name: 'Navigation' }).getByLabel('Langue').click();
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar\/pricing$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: 'الأسعار' })).toBeVisible();

  // Back to French: the prefixed link stores the choice, then lands on the canonical URL.
  await page.getByRole('navigation', { name: 'التنقل' }).getByLabel('اللغة').click();
  await page.getByRole('link', { name: 'Français' }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  expect(new URL(page.url()).pathname).toBe('/pricing');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('pricing lists the plan catalogue in dinars', async ({ page }, testInfo) => {
  await page.goto('/pricing');
  const basic = page.getByRole('article', { name: 'Basic' });
  await expect(basic.getByText('39,000 DT', { exact: true })).toBeVisible();
  await expect(basic.getByText('Recommandé')).toBeVisible();
  await expect(basic.getByRole('link', { name: 'Commencer' })).toHaveAttribute('href', '/signup');

  // Menu QR (ADR-0031): the menu only, then Basic adds table service.
  const menuQr = page.getByRole('article', { name: 'Menu QR' });
  await expect(menuQr.getByText('200,000 DT', { exact: true })).toBeVisible();
  await expect(menuQr.getByText('Sans abonnement')).toBeVisible();
  await expect(menuQr.getByRole('link', { name: 'Commander' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/21656525519$/,
  );
  await expect(menuQr.getByText('Appel serveur et demande d’addition')).toHaveCount(0);
  await expect(basic.getByText('Tout Menu QR, plus :')).toBeVisible();
  await expect(basic.getByText('Appel serveur et demande d’addition')).toBeVisible();

  const pro = page.getByRole('article', { name: 'Pro' });
  await expect(pro.getByText('99,000 DT', { exact: true })).toBeVisible();
  await expect(pro.getByText('Tout Basic, plus :')).toBeVisible();
  await expect(pro.getByText('Bientôt').first()).toBeVisible();
  await expect(pro.getByRole('link', { name: 'Nous contacter' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\//,
  );
  await expect(page.getByRole('article', { name: 'Premium' })).toContainText(
    'Tables, équipe et plats illimités',
  );

  expect(await horizontalOverflow(page), 'horizontal overflow').toBeLessThanOrEqual(0);
  if (testInfo.project.name.startsWith('chromium')) {
    expect(await seriousAxeViolations(page), 'axe').toEqual([]);
  }
});

test('legal drafts are marked pending review and kept out of search', async ({ page }) => {
  await page.goto('/ar/legal/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveText('وثيقة مؤقتة في انتظار المراجعة القانونية.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  await page.goto('/fr/legal/unknown');
  await expect(page.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeVisible();
});

test('the footer links to the demo photo credits', async ({ page }, testInfo) => {
  await page.goto('/fr/pricing');
  await page.getByRole('link', { name: 'Crédits photos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Crédits photos' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0' }).first()).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by-sa/4.0/',
  );
  expect(await horizontalOverflow(page), 'horizontal overflow').toBeLessThanOrEqual(0);
  if (testInfo.project.name.startsWith('chromium')) {
    expect(await seriousAxeViolations(page), 'axe').toEqual([]);
  }
});

test('robots.txt and the sitemap describe the marketing pages', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /dashboard');
  expect(robots).toContain('Sitemap:');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/ar/pricing');
  expect(sitemap).not.toContain('/legal/');
});
