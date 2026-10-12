import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * P0-07 design-system gallery: screenshots at 390 / 768 / 1440 × light/dark × FR/AR into
 * docs/design/system/, plus layout, accessibility and effective touch-target checks.
 * Requires a build with ENABLE_DEV_ROUTES=true; run with: DEV_ROUTES=1 pnpm test:e2e e2e/visual
 */
test.skip(!process.env.DEV_ROUTES, 'Set DEV_ROUTES=1 (and build with ENABLE_DEV_ROUTES=true).');

const CAPTURE_PROJECTS = new Set(['chromium-390', 'chromium-768', 'chromium-1440']);
const INTERACTIVE =
  'button:not([disabled]), a[href], input:not([type=hidden]):not([disabled]), textarea, select, [role=tab], [role=switch], [role=checkbox], [role=radio], [role=combobox]';

/**
 * Effective target size: hit-test 21 px around each control's centre (a 42–44 px zone).
 * A hit on the wrapping <label> counts, because it activates the control too.
 */
async function undersizedTargets(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const RADIUS = 21;
    const failures: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      // elementFromPoint only sees the viewport: bring the control into view first.
      element.scrollIntoView({ block: 'center', inline: 'center' });
      const box = element.getBoundingClientRect();
      // Visually hidden native inputs (Base UI form bridges) are not touch targets.
      if (box.width <= 4 || box.height <= 4) continue;
      const owner = element.closest('label') ?? element;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const probes: [number, number][] = [
        [cx - RADIUS, cy],
        [cx + RADIUS, cy],
        [cx, cy - RADIUS],
        [cx, cy + RADIUS],
      ];
      const ok = probes.every(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && (owner.contains(hit) || hit.contains(element));
      });
      if (!ok) {
        const label = (element.getAttribute('aria-label') ?? element.textContent).trim();
        failures.push(
          `${element.tagName.toLowerCase()} "${label.slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    return failures;
  }, INTERACTIVE);
}

for (const theme of ['light', 'dark'] as const) {
  for (const locale of ['fr', 'ar'] as const) {
    test(`design system ${theme} ${locale}`, async ({ page, context }, testInfo) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      ]);
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      const response = await page.goto(`/dev/design-system/${theme}`);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal overflow').toBe(0);

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
