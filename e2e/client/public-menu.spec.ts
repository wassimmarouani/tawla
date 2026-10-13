import { expect, test, type Page } from '@playwright/test';
import { DEMO_RESTAURANTS } from '../../tooling/demo/demo';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
} from '../fixtures/quality';

/** Customer menu `/{slug}` on the demo seed (P1-07a). Requires `pnpm db:reset` data. */

const BUDGET_BYTES = 150 * 1024;

async function cumulativeLayoutShift(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          resolve(total);
        }, 1500);
      }),
  );
}

test.beforeEach(async ({ context, baseURL }) => {
  // Host-only, like the cookie the app sets, so switching language replaces it.
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', url: baseURL ?? '' }]);
});

test('shows the venue, its photo grid, printed lists and sold-out items', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const response = await page.goto('/cafe-el-bahja');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Café El Bahja' })).toBeVisible();
  await expect(page).toHaveTitle('Café El Bahja · Menu');

  const sections = page.locator('main section');
  await expect(sections).toHaveCount(9);
  await expect(sections.first().getByRole('heading', { level: 2 })).toHaveText(
    'Nos incontournables',
  );
  // The first photo is the LCP candidate: eager, high priority, intrinsic size.
  const firstPhoto = sections.first().locator('img').first();
  await expect(firstPhoto).toHaveAttribute('fetchpriority', 'high');
  await expect(firstPhoto).toHaveAttribute('loading', 'eager');
  await expect(firstPhoto).toHaveAttribute('width', /\d+/);

  await expect(page.getByText('À partir de 2,800 DT')).toBeVisible();
  await expect(page.locator('[data-available="false"]')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Catégories' }).getByRole('link')).toHaveCount(
    9,
  );

  expect(await horizontalOverflow(page)).toBe(0);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('has no layout shift and stays within the JavaScript budget', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-390', 'Measured once, on a phone width.');
  let scriptBytes = 0;
  page.on('requestfinished', (request) => {
    if (request.resourceType() !== 'script') return;
    void request.sizes().then((sizes) => {
      scriptBytes += sizes.responseBodySize;
    });
  });
  await page.goto('/cafe-el-bahja', { waitUntil: 'networkidle' });
  expect(await cumulativeLayoutShift(page)).toBe(0);
  expect(scriptBytes, `initial JS ${String(Math.round(scriptBytes / 1024))} KB`).toBeLessThan(
    BUDGET_BYTES,
  );
});

test('switches to Arabic from the venue pills, right to left', async ({ page }) => {
  await page.goto('/cafe-el-bahja');
  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 2, name: 'أطباقنا المميزة' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'العربية' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('jumps to a category from the sticky bar', async ({ page }) => {
  await page.goto('/cafe-el-bahja');
  const nav = page.getByRole('navigation', { name: 'Catégories' });
  await nav.getByRole('link', { name: 'Glaces' }).click();
  await expect(page).toHaveURL(/#cat-/);
  await expect(page.getByRole('heading', { level: 2, name: 'Glaces' })).toBeInViewport();
  await expect(nav.getByRole('link', { name: 'Glaces' })).toHaveAttribute('aria-current', 'true');
});

test('a photo-less menu uses printed lists and its own brand colour', async ({ page }) => {
  await page.goto('/pizzeria-test');
  await expect(page.getByRole('heading', { level: 1, name: 'Pizzeria Test' })).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);
  // A short menu fits on screen: the first category stays the active one.
  await expect(
    page.getByRole('navigation', { name: 'Catégories' }).getByRole('link').first(),
  ).toHaveAttribute('aria-current', 'true');
  await expect(
    page.locator(`[data-tenant="${DEMO_RESTAURANTS['pizzeria-test'].publicId}"]`),
  ).toBeVisible();
  // Café El Bahja's dishes never leak into another tenant.
  await expect(page.getByText('Capucin')).toHaveCount(0);
});

test('an unknown venue gets a friendly page without details', async ({ page }) => {
  await page.goto('/cafe-qui-nexiste-pas');
  await expect(page.getByRole('heading', { name: 'Menu introuvable' })).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);
});
