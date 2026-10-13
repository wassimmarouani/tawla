/**
 * `pnpm screenshots <route> [--as owner|manager|counter|pizzeriaOwner|none] [--base <url>]`
 *
 * Design review captures (P0-12, CLAUDE.md working method): 390/768/1440 × light/dark × fr/ar
 * (12 images), plus layout checks at all 7 widths in both directions: horizontal scroll,
 * elements sticking out, touch targets (44 px, 48 px on /staff), truncated text (warning),
 * serious axe violations and console errors. Writes images and report.md/report.json to
 * e2e/__screenshots__/review/<route>/ and exits with 1 when a check fails.
 * Needs the app running (pnpm dev or pnpm start) and local Supabase with the demo seed.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  collectConsoleErrors,
  horizontalOverflow,
  overflowingElements,
  seriousAxeViolations,
  truncatedTexts,
  undersizedTargets,
} from '../e2e/fixtures/quality';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from '../tooling/demo/demo';

const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const CAPTURE_WIDTHS = new Set<number>([390, 768, 1440]);
const LOCALES = ['fr', 'ar'] as const;
const SCHEMES = ['light', 'dark'] as const;

interface Run {
  width: number;
  locale: (typeof LOCALES)[number];
  scheme: (typeof SCHEMES)[number];
  failures: string[];
  warnings: string[];
  image?: string;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    as: { type: 'string' },
    base: { type: 'string', default: process.env.SCREENSHOTS_BASE_URL ?? 'http://localhost:3000' },
  },
});

const route = positionals[0];
if (!route?.startsWith('/')) {
  process.stderr.write(
    'Usage: pnpm screenshots <route starting with /> [--as owner] [--base url]\n',
  );
  process.exit(2);
}
const base = values.base;
const account = resolveAccount(route, values.as);
const minTarget = route.startsWith('/staff') ? 48 : 44;
const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
const outDir = path.resolve('e2e/__screenshots__/review', slug);

function resolveAccount(target: string, requested: string | undefined): DemoAccount | null {
  if (requested === 'none') return null;
  if (requested) {
    if (requested in DEMO_ACCOUNTS) return requested as DemoAccount;
    process.stderr.write(
      `Unknown account "${requested}": ${Object.keys(DEMO_ACCOUNTS).join(', ')}\n`,
    );
    process.exit(2);
  }
  return /^\/(dashboard|admin)(\/|$)/.test(target) ? 'owner' : null;
}

async function signedInState(browser: Browser): Promise<string | undefined> {
  if (!account) return undefined;
  const context = await browser.newContext({ baseURL: base });
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(DEMO_ACCOUNTS[account].email);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  const file = path.join(outDir, '.auth.json');
  await context.storageState({ path: file });
  await context.close();
  return file;
}

async function open(
  browser: Browser,
  run: Omit<Run, 'failures' | 'warnings'>,
  storageState: string | undefined,
): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const touch = run.width < 1024;
  const context = await browser.newContext({
    baseURL: base,
    viewport: { width: run.width, height: run.width < 768 ? 844 : 900 },
    hasTouch: touch,
    colorScheme: run.scheme,
    // Stable measurements: no colour transitions mid-check (axe contrast), no smooth scrolling.
    reducedMotion: 'reduce',
    ...(storageState ? { storageState } : {}),
  });
  await context.addCookies([{ name: 'NEXT_LOCALE', value: run.locale, url: base }]);
  const page = await context.newPage();
  const errors = collectConsoleErrors(page);
  const response = await page.goto(route ?? '/');
  if (!response || response.status() >= 400) {
    errors.push(`HTTP ${response?.status() ?? 'no response'} for ${route ?? ''}`);
  }
  await page
    .locator('h1')
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {
      errors.push('No h1 rendered');
    });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

async function check(page: Page, run: Run, errors: string[]) {
  const overflow = await horizontalOverflow(page);
  if (overflow > 0) run.failures.push(`horizontal scroll: ${overflow}px`);
  for (const element of await overflowingElements(page)) {
    run.failures.push(`sticks out: ${element}`);
  }
  if (run.width < 1024 || minTarget === 48) {
    for (const target of await undersizedTargets(page, minTarget)) {
      run.failures.push(`target < ${minTarget}px: ${target}`);
    }
  }
  for (const text of await truncatedTexts(page)) run.warnings.push(`truncated: ${text}`);
  for (const error of errors) run.failures.push(`console: ${error.slice(0, 160)}`);
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  try {
    await fetch(base);
  } catch {
    process.stderr.write(`Nothing answers at ${base}. Start the app (pnpm dev) first.\n`);
    process.exit(2);
  }

  const browser = await chromium.launch();
  const runs: Run[] = [];
  try {
    const storageState = await signedInState(browser);
    for (const width of WIDTHS) {
      for (const locale of LOCALES) {
        const schemes = CAPTURE_WIDTHS.has(width) ? SCHEMES : (['light'] as const);
        for (const scheme of schemes) {
          const run: Run = { width, locale, scheme, failures: [], warnings: [] };
          const { context, page, errors } = await open(browser, run, storageState);
          await check(page, run, errors);
          if (CAPTURE_WIDTHS.has(width)) {
            for (const violation of await seriousAxeViolations(page)) {
              run.failures.push(`axe: ${violation}`);
            }
            run.image = `${width}-${scheme}-${locale}.jpg`;
            // The checks scroll controls into view; capture from the top like a visitor.
            await page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            await page.screenshot({
              path: path.join(outDir, run.image),
              fullPage: true,
              type: 'jpeg',
              quality: 75,
            });
          }
          runs.push(run);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    await rm(path.join(outDir, '.auth.json'), { force: true });
  }

  const failed = runs.filter((run) => run.failures.length > 0);
  const report = [
    `# Screenshot review: \`${route ?? ''}\``,
    '',
    `Base ${base} · account ${account ?? 'none'} · ${new Date().toISOString()}`,
    '',
    `**${failed.length === 0 ? 'PASS' : 'FAIL'}**: ${runs.length} runs (7 widths × fr/ar, light and dark on captures), ${runs.filter((run) => run.image).length} images.`,
    '',
    '| Width | Locale | Theme | Result | Details |',
    '| ----- | ------ | ----- | ------ | ------- |',
    ...runs.map((run) => {
      const details = [...run.failures, ...run.warnings.map((warning) => `⚠ ${warning}`)];
      const result = run.failures.length > 0 ? 'FAIL' : run.warnings.length > 0 ? 'warn' : 'ok';
      const cell = details.join('<br>').replaceAll('|', '\\|') || (run.image ?? '');
      return `| ${run.width} | ${run.locale} | ${run.scheme} | ${result} | ${cell} |`;
    }),
    '',
  ].join('\n');
  await writeFile(path.join(outDir, 'report.md'), report);
  await writeFile(path.join(outDir, 'report.json'), `${JSON.stringify(runs, null, 2)}\n`);
  process.stdout.write(
    `${failed.length === 0 ? 'PASS' : 'FAIL'} ${route ?? ''}: ${runs.length} runs, report in ${path.relative(process.cwd(), outDir)}/report.md\n`,
  );
  if (failed.length > 0) process.exitCode = 1;
}

await main();
