import { expect, type Page } from '@playwright/test';

/**
 * Opens the back-office command palette with Ctrl + K. The shortcut listener attaches on
 * hydration, so a press that lands earlier is retried.
 */
export async function openCommandPalette(page: Page) {
  const palette = page.getByRole('dialog');
  await expect(async () => {
    if (!(await palette.isVisible())) await page.keyboard.press('Control+k');
    await expect(palette).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return palette;
}
