import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
  undersizedTargets,
} from '../fixtures/quality';

/**
 * P0-07 design-system gallery: screenshots at 390 / 768 / 1440 × light/dark × FR/AR into
 * docs/design/system/, plus layout, accessibility and effective touch-target checks.
 * Requires a build with ENABLE_DEV_ROUTES=true; run with: DEV_ROUTES=1 pnpm test:e2e e2e/visual
 */
test.skip(!process.env.DEV_ROUTES, 'Set DEV_ROUTES=1 (and build with ENABLE_DEV_ROUTES=true).');

const CAPTURE_PROJECTS = new Set(['chromium-390', 'chromium-768', 'chromium-1440']);
for (const theme of ['light', 'dark'] as const) {
  for (const locale of ['fr', 'ar'] as const) {
    test(`design system ${theme} ${locale}`, async ({ page, context }, testInfo) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      ]);
      const errors = collectConsoleErrors(page);

      const response = await page.goto(`/dev/design-system/${theme}`);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);

      expect(await horizontalOverflow(page), 'horizontal overflow').toBe(0);

      if (CAPTURE_PROJECTS.has(testInfo.project.name)) {
        const width = testInfo.project.name.replace('chromium-', '');
        await page.screenshot({
          path: `docs/design/system/${width}-${theme}-${locale}.jpg`,
          fullPage: true,
          type: 'jpeg',
          quality: 72,
        });
      }

      // Touch screens need 44 px targets; fine pointers (≥ 1024 px desktop projects) may use 36.
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 1024) {
        expect(await undersizedTargets(page), 'touch targets under 44 px').toEqual([]);
      }

      expect(await seriousAxeViolations(page), 'axe serious/critical violations').toEqual([]);
      expect(errors, 'console errors').toEqual([]);
    });
  }
}
