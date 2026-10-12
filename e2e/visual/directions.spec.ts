import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * P0-06 visual directions: captures the customer menu prototype for every direction × variant
 * × locale at 390px into docs/design/directions/, and checks layout + accessibility.
 * Requires a build with ENABLE_DEV_ROUTES=true; run with: DIRECTIONS=1 pnpm test:e2e e2e/visual
 */
test.skip(!process.env.DIRECTIONS, 'Set DIRECTIONS=1 (and build with ENABLE_DEV_ROUTES=true).');

const ALL_DIRECTIONS = ['a', 'b', 'c', 'm'];
// DIRECTIONS=1 captures everything; DIRECTIONS=m (or a,m…) captures a subset.
const DIRECTIONS =
  process.env.DIRECTIONS && process.env.DIRECTIONS !== '1'
    ? process.env.DIRECTIONS.split(',').filter((id) => ALL_DIRECTIONS.includes(id))
    : ALL_DIRECTIONS;
const LOCALES = ['fr', 'ar'] as const;
const VARIANTS = (['light', 'dark'] as const).flatMap((theme) =>
  ['photos', 'nophotos'].flatMap((photos) =>
    ['saffron', 'olive'].map((brand) => `${theme}-${photos}-${brand}`),
  ),
);

for (const direction of DIRECTIONS) {
  for (const locale of LOCALES) {
    for (const variant of VARIANTS) {
      test(`${direction} ${locale} ${variant}`, async ({ page, context }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium-390', 'Captured at 390px only.');
        await context.addCookies([
          { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
        ]);
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });

        const response = await page.goto(`/dev/directions/${direction}/${variant}`);
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, 'horizontal overflow').toBe(0);

        const base = `docs/design/directions/${direction}/${locale}-${variant}`;
        // First screen, as the customer sees it after scanning (fixed service bar at the bottom).
        await page.screenshot({ path: `${base}.jpg`, type: 'jpeg', quality: 80 });
        // Whole menu: pin the fixed bar to the end of the page so it doesn't float mid-capture.
        await page.addStyleTag({
          content: '.proto{position:relative}.proto .service-bar{position:absolute}',
        });
        await page.screenshot({
          path: `${base}-full.jpg`,
          fullPage: true,
          type: 'jpeg',
          quality: 72,
        });

        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();
        const serious = axe.violations
          .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
          .map(
            (violation) =>
              `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
          );
        expect(serious, 'axe serious/critical violations').toEqual([]);
        expect(errors, 'console errors').toEqual([]);
      });
    }
  }
}
