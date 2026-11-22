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
  // Measure CLS AFTER variant Google Fonts have settled: start the observer only once
  // document.fonts.ready resolves, so the font-swap shift isn't counted as user-visible CLS.
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        void document.fonts.ready.then(() => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: false });
          setTimeout(() => {
            resolve(total);
          }, 1500);
        });
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
  // Variant fonts (Google Fonts) may cause a tiny CLS as they swap in: stay well under CWV
  // "Good" threshold (0.1) rather than demanding a perfect 0.
  expect(await cumulativeLayoutShift(page)).toBeLessThanOrEqual(0.1);
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
  // The bar auto-scrolls its active chip into view on mount; wait for that to settle before
  // tapping, so WebKit does not drop the anchor's default navigation mid horizontal-scroll.
  const glaces = nav.getByRole('link', { name: 'Glaces' });
  await glaces.scrollIntoViewIfNeeded();
  await glaces.click();
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

test('a product opens in a sheet that Esc, Back and the close button all dismiss', async ({
  page,
}) => {
  await page.goto('/cafe-el-bahja');
  await page.getByRole('link', { name: 'Citronnade' }).click();
  await expect(page).toHaveURL(/\?p=citronnade$/);
  const sheet = page.getByRole('dialog', { name: 'Citronnade' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Taille')).toBeVisible();
  await expect(sheet.getByText('+2,000 DT')).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Allergènes' })).toBeVisible();
  expect(await seriousAxeViolations(page)).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/cafe-el-bahja$/);

  await page.getByRole('link', { name: 'Ojja merguez' }).click();
  await expect(page.getByRole('dialog', { name: 'Ojja merguez' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/cafe-el-bahja?p=baklawa');
  const soldOut = page.getByRole('dialog', { name: 'Baklawa' });
  await expect(soldOut.getByText('Indisponible').first()).toBeVisible();
  await soldOut.getByRole('button', { name: 'Fermer' }).click();
  await expect(soldOut).toBeHidden();
});

test('an unknown product parameter is ignored', async ({ page }) => {
  await page.goto('/cafe-el-bahja?p=nope');
  await expect(page.getByRole('heading', { level: 1, name: 'Café El Bahja' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('search finds dishes across spellings and opens their sheet', async ({ page }) => {
  await page.goto('/cafe-el-bahja');
  await page.getByRole('button', { name: 'Rechercher un plat, une boisson…' }).click();
  const panel = page.getByRole('dialog', { name: 'Rechercher dans le menu' });
  await expect(panel).toBeVisible();
  await panel.getByRole('searchbox').fill('kapsin');
  await expect(panel.getByRole('status')).toHaveText(/résultat/);
  await panel.getByRole('link', { name: /Capucin/ }).click();
  await expect(page.getByRole('dialog', { name: 'Capucin' })).toBeVisible();
  await expect(page).toHaveURL(/\?p=capucin$/);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Rechercher un plat, une boisson…' }).click();
  await panel.getByRole('searchbox').fill('قهوة');
  await expect(panel.getByRole('link', { name: /Café turc/ })).toBeVisible();
  await panel.getByRole('searchbox').fill('zzzz');
  await expect(panel.getByRole('status')).toHaveText(/Aucun plat ne correspond/);
});

test('filters keep only matching dishes and hide empty sections', async ({ page }) => {
  await page.goto('/cafe-el-bahja');
  const filters = page.getByRole('group', { name: 'Filtrer les plats' });
  await filters.getByRole('button', { name: 'Épicé' }).click();
  await expect(filters.getByRole('button', { name: 'Épicé' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('link', { name: 'Ojja merguez' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Express' })).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Cafés' })).toBeHidden();
  await expect(
    page.getByRole('navigation', { name: 'Catégories' }).getByRole('link', { name: 'Cafés' }),
  ).toBeHidden();

  await filters.getByRole('button', { name: 'Nouveau' }).click();
  await expect(page.getByText('Aucun plat ne correspond à ces filtres.')).toBeVisible();
  await filters.getByRole('button', { name: 'Nouveau' }).click();
  await filters.getByRole('button', { name: 'Épicé' }).click();
  await expect(page.getByRole('link', { name: 'Express' })).toBeVisible();
});

test('exposes structured data, a canonical URL and a social card', async ({ page }) => {
  await page.goto('/cafe-el-bahja');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? '{}') as {
    '@type': string;
    name: string;
    hasMenu: { hasMenuSection: { hasMenuItem: { name: string; offers: { price: string } }[] }[] };
  };
  expect(data['@type']).toBe('CafeOrCoffeeShop');
  expect(data.name).toBe('Café El Bahja');
  const items = data.hasMenu.hasMenuSection.flatMap((section) => section.hasMenuItem);
  expect(items.find((item) => item.name === 'Capucin')?.offers.price).toBe('2.200');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/cafe-el-bahja$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.webp$/);
});
