import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { localSupabase } from '../../tooling/testing/local-supabase';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
  undersizedTargets,
} from '../fixtures/quality';
import { openCommandPalette } from '../fixtures/dashboard';

/**
 * Signed-in back-office screens at every width × light/dark × FR/AR: venue creation fallback,
 * dashboard home, 403. REVIEW=1 saves captures to test-results/review/ (not committed).
 */

const PASSWORD = 'correct-horse-battery-staple';
const REVIEW_PROJECTS = new Set(['chromium-390', 'chromium-768', 'chromium-1440']);
const COPY = {
  fr: {
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    logIn: 'Se connecter',
    venueName: 'Nom de l’établissement',
    create: 'Créer l’établissement',
    forbidden: 'Accès refusé',
    back: 'Revenir à mon établissement',
    team: 'Équipe',
  },
  ar: {
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    logIn: 'تسجيل الدخول',
    venueName: 'اسم المؤسسة',
    create: 'إنشاء المؤسسة',
    forbidden: 'الوصول مرفوض',
    back: 'العودة إلى مؤسستي',
    team: 'الفريق',
  },
} as const;

async function check(page: Page, name: string, capture: string | null) {
  await page.evaluate(() => document.fonts.ready);
  expect(await horizontalOverflow(page), `${name} horizontal overflow`).toBe(0);
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 1024) {
    expect(await undersizedTargets(page), `${name} touch targets`).toEqual([]);
  }
  expect(await seriousAxeViolations(page), `${name} axe`).toEqual([]);
  if (capture) {
    await page.screenshot({
      path: `test-results/review/${name}-${capture}.jpg`,
      fullPage: true,
      type: 'jpeg',
      quality: 70,
    });
  }
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['fr', 'ar'] as const) {
    test(`dashboard screens ${scheme} ${locale}`, async ({ page, context }, testInfo) => {
      test.setTimeout(60_000);
      const copy = COPY[locale];
      const email = `screens-${testInfo.project.name}-${scheme}-${locale}-${Date.now()}@example.org`;
      const { apiUrl, secretKey } = localSupabase();
      const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
      const { error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      expect(error).toBeNull();

      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      ]);
      await page.emulateMedia({ colorScheme: scheme });
      const errors = collectConsoleErrors(page);
      const capture =
        process.env.REVIEW && REVIEW_PROJECTS.has(testInfo.project.name)
          ? `${testInfo.project.name.replace('chromium-', '')}-${scheme}-${locale}`
          : null;

      await page.goto('/login');
      await page.getByLabel(copy.email, { exact: true }).fill(email);
      await page.getByLabel(copy.password, { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: copy.logIn }).click();

      // No restaurant yet: the venue form.
      const venueName = page.getByLabel(copy.venueName, { exact: true }).filter({ visible: true });
      await expect(venueName).toBeVisible();
      await check(page, 'dashboard-create-venue', capture);
      await venueName.fill(locale === 'ar' ? 'مقهى البهجة' : 'Café des Écrans');
      await page.getByRole('button', { name: copy.create }).click();

      // Dashboard home.
      const heading = page.getByRole('heading', { level: 1 });
      // Venue creation runs a transaction and a redirect; give it room when the suite runs
      // image processing in parallel.
      await expect(heading).toHaveText(locale === 'ar' ? 'مقهى البهجة' : 'Café des Écrans', {
        timeout: 20_000,
      });
      await check(page, 'dashboard-home', capture);

      // Command palette, then a section page.
      await openCommandPalette(page);
      await check(page, 'dashboard-palette', capture);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.goto('/dashboard/team');
      await expect(heading).toHaveText(copy.team);
      await check(page, 'dashboard-section', capture);
      await page.goto('/dashboard');

      // A restaurant outside the memberships: 403, then back to the user's own.
      await context.addCookies([
        {
          name: 'tawla_restaurant',
          value: '00000000-0000-4000-8000-0000000000ff',
          domain: 'localhost',
          path: '/',
        },
      ]);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: copy.forbidden })).toBeVisible();
      await check(page, 'dashboard-forbidden', capture);
      await page.getByRole('button', { name: copy.back }).click();
      await expect(heading).toHaveText(locale === 'ar' ? 'مقهى البهجة' : 'Café des Écrans');

      expect(errors, 'console errors').toEqual([]);
    });
  }
}
