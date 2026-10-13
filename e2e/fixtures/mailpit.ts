import { expect } from '@playwright/test';

/** Local Supabase captures auth emails in Mailpit (docs/setup.md). */
const MAILPIT = 'http://127.0.0.1:54324/api/v1';

interface MailpitSearch {
  messages?: { ID: string; Subject: string }[];
}

/**
 * Waits for the latest email to `to` whose link targets `path`, and returns that link as a
 * relative URL (the app under test may run on another port than the one baked into the link).
 */
export async function emailLink(to: string, path: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = (await (
          await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${to}"`)}`)
        ).json()) as MailpitSearch;
        for (const summary of search.messages ?? []) {
          const message = (await (await fetch(`${MAILPIT}/message/${summary.ID}`)).json()) as {
            HTML: string;
          };
          const href = /href="([^"]*token_hash=[^"]*)"/.exec(message.HTML)?.[1];
          if (!href) continue;
          const url = new URL(href.replaceAll('&amp;', '&'));
          if (url.pathname === path) {
            link = `${url.pathname}${url.search}`;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
  return link ?? '';
}
