import { expect, test } from '@playwright/test';

test.describe('locale routing (ADR-0012)', () => {
  test('marketing home defaults to French without a prefix', async ({ browser }) => {
    // A visitor whose browser prefers no supported language gets the default locale.
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await context.close();
  });

  test('marketing home follows an English browser to /en', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    expect(new URL(page.url()).pathname).toBe('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await context.close();
  });

  test('marketing pages keep visible prefixes for Arabic and English', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('القائمة الرقمية للمقاهي والمطاعم التونسية.')).toBeVisible();

    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('restaurant slugs are rewritten without a visible locale', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'ar', domain: 'localhost', path: '/' },
    ]);
    const response = await page.goto('/cafe-el-bahja');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/cafe-el-bahja');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 2, name: 'أطباقنا المميزة' })).toBeVisible();
  });

  test('app paths have no visible locale and follow Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
    await context.close();
  });

  test('security headers are present on every surface', async ({ request }) => {
    for (const path of ['/', '/t/some-token', '/dashboard']) {
      const response = await request.get(path);
      const headers = response.headers();
      expect(headers['content-security-policy'], path).toContain("object-src 'none'");
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
    }
    const customer = await request.get('/t/some-token');
    expect(customer.headers()['x-frame-options']).toBe('SAMEORIGIN');
    const app = await request.get('/dashboard');
    expect(app.headers()['x-frame-options']).toBe('DENY');
  });
});
