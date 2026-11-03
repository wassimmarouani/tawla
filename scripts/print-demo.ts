/**
 * Prints the local demo entry points after `pnpm db:reset` (P0-12). Local credentials only.
 */
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_RESTAURANTS, DEMO_TABLES } from '../tooling/demo/demo';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const pad = (value: string, width: number) => value.padEnd(width);

const lines = [
  '',
  'Demo data ready (local only)',
  '',
  `  Back-office   ${appUrl}/login`,
  ...Object.entries(DEMO_RESTAURANTS).map(
    ([slug, restaurant]) => `  ${pad(restaurant.name, 14)}${appUrl}/${slug}`,
  ),
  `  Table 1       ${appUrl}/t/${DEMO_TABLES['cafe-el-bahja'][0]}  (tables 1–12)`,
  '  Mailpit       http://127.0.0.1:54324',
  '  Studio        http://127.0.0.1:54323',
  '',
  `  Accounts (password: ${DEMO_PASSWORD})`,
  ...Object.values(DEMO_ACCOUNTS).map(
    (account) => `    ${pad(account.email, 30)}${pad(account.role, 9)}${account.restaurant}`,
  ),
  '',
];
process.stdout.write(`${lines.join('\n')}\n`);
