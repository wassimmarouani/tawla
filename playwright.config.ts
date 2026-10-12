import { defineConfig, devices } from '@playwright/test';

/** Widths every screen must handle (CLAUDE.md rule 6). */
export const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    ...WIDTHS.map((width) => ({
      name: `chromium-${width}`,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width, height: width < 768 ? 844 : 900 },
        hasTouch: width < 1024,
        isMobile: false,
      },
    })),
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      APP_DOMAIN: 'localhost',
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_APP_NAME: 'Tawla',
    },
  },
});
