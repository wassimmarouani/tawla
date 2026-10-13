import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
  undersizedTargets,
} from '../fixtures/quality';

/**
 * Auth screens at every width × light/dark × FR/AR: no overflow, 44 px touch targets,
 * zero serious axe violations, no console errors. REVIEW=1 saves full-page captures to
 * test-results/review/ for the design review (not committed).
 */

const SCREENS = ['/login', '/signup', '/reset', '/signup/confirm?token_hash=x'] as const;
const REVIEW_PROJECTS = new Set(['chromium-390', 'chromium-768', 'chromium-1440']);

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['fr', 'ar'] as const) {
    test(`auth screens ${scheme} ${locale}`, async ({ page, context }, testInfo) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      ]);
      await page.emulateMedia({ colorScheme: scheme });
      const errors = collectConsoleErrors(page);

      for (const screen of SCREENS) {
        const response = await page.goto(screen);
        expect(response?.status(), screen).toBe(200);
        await expect(page.locator('h1')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.locator('html').getAttribute('dir')).toBe(
          locale === 'ar' ? 'rtl' : 'ltr',
        );

        expect(await horizontalOverflow(page), `${screen} horizontal overflow`).toBe(0);
        const viewport = page.viewportSize();
        if (viewport && viewport.width < 1024) {
          expect(await undersizedTargets(page), `${screen} touch targets`).toEqual([]);
        }
        expect(await seriousAxeViolations(page), `${screen} axe`).toEqual([]);

        if (process.env.REVIEW && REVIEW_PROJECTS.has(testInfo.project.name)) {
          const width = testInfo.project.name.replace('chromium-', '');
          const name = screen.split('?')[0]?.slice(1).replaceAll('/', '-') ?? 'screen';
          await page.screenshot({
            path: `test-results/review/${name}-${width}-${scheme}-${locale}.jpg`,
            fullPage: true,
            type: 'jpeg',
            quality: 70,
          });
        }
      }
      expect(errors, 'console errors').toEqual([]);
    });
  }
}
