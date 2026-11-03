import { expect, test } from '@playwright/test';
import { DEMO_RESTAURANTS } from '../../tooling/demo/demo';
import {
  collectConsoleErrors,
  horizontalOverflow,
  seriousAxeViolations,
} from '../fixtures/quality';
import { database, newOwnerWithVenue, warmUpRealtime } from '../fixtures/venue';

/**
 * P1-10 acceptance: the table menu's "Call waiter / Bill" bar with its live states, feedback
 * after the bill, and sold-out changes reaching an open menu within 5 s. Staff claims are
 * simulated in SQL until the staff screen lands (P1-12).
 */

const EL_BAHJA = 'b0000000-0000-4000-8000-000000000001';
const PROJECTS = new Set(['chromium-360', 'chromium-390', 'chromium-1440', 'webkit-iphone']);

// Onboarding, realtime warm-up and two browser contexts per journey.
test.describe.configure({ timeout: 90_000 });

const FRENCH = [{ name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' }];

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Phones, one desktop and WebKit.');
  await context.addCookies(FRENCH);
});

test.beforeAll(async () => {
  await warmUpRealtime(DEMO_RESTAURANTS['cafe-el-bahja'].publicId);
});

/** A fresh El Bahja table per test: cooldowns are per table. */
async function freshTable(): Promise<{ token: string; number: number; drop: () => Promise<void> }> {
  const sql = database();
  for (;;) {
    const number = 100 + Math.floor(Math.random() * 899);
    const [row] = await sql<{ token: string }[]>`
      insert into public.tables (restaurant_id, number) values (${EL_BAHJA}, ${number})
      on conflict do nothing returning token`;
    if (row) {
      return {
        token: row.token,
        number,
        drop: async () => {
          await sql`delete from public.tables where token = ${row.token}`;
          await sql.end();
        },
      };
    }
  }
}

async function setRequestStatus(token: string, kind: 'waiter' | 'bill', status: string) {
  const sql = database();
  try {
    const rows = await sql`
      update public.service_requests r
      set status = ${status}::public.service_request_status,
          claimed_at = coalesce(r.claimed_at, now()),
          done_at = case when ${status} = 'done' then now() end
      from public.table_sessions s join public.tables t on t.id = s.table_id
      where r.table_session_id = s.id and t.token = ${token} and r.kind = ${kind}
        and r.status in ('open', 'claimed')
      returning r.id`;
    expect(rows.length, `${kind} request to update`).toBe(1);
  } finally {
    await sql.end();
  }
}

test('calls the waiter, shows the claim, asks for the bill and collects feedback', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const table = await freshTable();
  try {
    await page.goto(`/t/${table.token}`);
    const bar = page.getByRole('region', { name: 'Service à table' });
    await expect(bar).toBeVisible();
    await expect(page.getByText(`Table ${String(table.number)}`, { exact: true })).toBeVisible();
    expect(await seriousAxeViolations(page), 'idle bar axe').toEqual([]);
    for (const button of await bar.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0), 'bar target size').toBeGreaterThanOrEqual(
        44,
      );
    }

    // Call: staff alerted, countdown, then the claim arrives live on the s: channel.
    await bar.getByRole('button', { name: 'Appeler le serveur' }).click();
    await expect(bar.getByText('Le personnel est prévenu.', { exact: false })).toBeVisible();
    const call = bar.getByRole('button', { name: /Serveur prévenu/ });
    await expect(call).toBeDisabled();
    await expect(call).toContainText(/Nouvel appel dans 0:[0-5]\d/);
    await setRequestStatus(table.token, 'waiter', 'claimed');
    await expect(bar.getByText('Un serveur a pris votre appel, il arrive.')).toBeVisible({
      timeout: 5000,
    });

    // Bill by card: the choice is inline, never a blocking dialog.
    await bar.getByRole('button', { name: 'L’addition' }).click();
    const choice = bar.getByRole('group', { name: 'Comment souhaitez-vous payer ?' });
    await expect(choice.getByRole('button', { name: 'Espèces' })).toBeFocused();
    expect(await horizontalOverflow(page)).toBe(0);
    await choice.getByRole('button', { name: 'Carte bancaire' }).click();
    await expect(
      bar.getByText('Addition demandée (Carte bancaire).', { exact: false }),
    ).toBeVisible();

    // A reload restores the state from the server.
    await page.reload();
    await expect(
      bar.getByText('Addition demandée (Carte bancaire).', { exact: false }),
    ).toBeVisible();

    // Bill handled → feedback, then the Google review invitation on 5 stars.
    await setRequestStatus(table.token, 'bill', 'done');
    const feedback = bar.getByRole('form', { name: 'Comment s’est passé votre moment ?' });
    await expect(feedback).toBeVisible({ timeout: 5000 });
    expect(await seriousAxeViolations(page), 'feedback axe').toEqual([]);
    // The star is the radio's label (the input itself is visually hidden).
    await feedback.getByRole('radio', { name: '5 étoiles sur 5' }).locator('..').click();
    await expect(feedback.getByRole('radio', { name: '5 étoiles sur 5' })).toBeChecked();
    await feedback.getByLabel('Un mot pour l’équipe ? (facultatif)').fill('Très bon café');
    await feedback.getByRole('button', { name: 'Envoyer' }).click();
    await expect(bar.getByText('Merci pour votre avis !')).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Laisser un avis sur Google' })).toHaveAttribute(
      'href',
      'https://g.page/r/demo-el-bahja/review',
    );
    const sql = database();
    try {
      const [row] = await sql<{ rating: number; comment: string }[]>`
        select f.rating, f.comment from public.feedbacks f
        join public.table_sessions s on s.id = f.table_session_id
        join public.tables t on t.id = s.table_id where t.token = ${table.token}`;
      expect(row).toEqual({ rating: 5, comment: 'Très bon café' });
    } finally {
      await sql.end();
    }
    await bar.getByRole('button', { name: 'Fermer' }).click();
    await expect(bar.getByText('Merci pour votre avis !')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await table.drop();
  }
});

test('the table menu stays within the JavaScript budget, with no websocket on load', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-390', 'Measured once, on a phone width.');
  const table = await freshTable();
  try {
    let scriptBytes = 0;
    let sockets = 0;
    page.on('websocket', () => {
      sockets += 1;
    });
    page.on('requestfinished', (request) => {
      if (request.resourceType() !== 'script') return;
      void request.sizes().then((sizes) => {
        scriptBytes += sizes.responseBodySize;
      });
    });
    await page.goto(`/t/${table.token}`, { waitUntil: 'networkidle' });
    expect(scriptBytes, `initial JS ${String(Math.round(scriptBytes / 1024))} KB`).toBeLessThan(
      150 * 1024,
    );
    expect(sockets, 'ADR-0008 §5: no websocket before an interaction').toBe(0);
  } finally {
    await table.drop();
  }
});

test('the cooldown is shared by the table and survives the other phone', async ({
  page,
  browser,
}) => {
  const table = await freshTable();
  const other = await browser.newContext();
  await other.addCookies(FRENCH);
  try {
    await page.goto(`/t/${table.token}`);
    await page.getByRole('button', { name: 'Appeler le serveur' }).click();
    await expect(page.getByText('Le personnel est prévenu.', { exact: false })).toBeVisible();

    const phone = await other.newPage();
    await phone.goto(`/t/${table.token}`);
    await phone.getByRole('button', { name: 'Appeler le serveur' }).click();
    await expect(
      phone.getByText(/Déjà demandé pour cette table\. Nouvel essai possible dans 0:[0-5]\d\./),
    ).toBeVisible();
    await expect(phone.getByRole('button', { name: /Appeler le serveur/ })).toBeDisabled();
  } finally {
    await other.close();
    await table.drop();
  }
});

test('goes offline gracefully', async ({ page, context }) => {
  const table = await freshTable();
  try {
    await page.goto(`/t/${table.token}`);
    await context.setOffline(true);
    await expect(
      page.getByText('Pas de connexion. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Appeler le serveur' })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Appeler le serveur' })).toBeEnabled();
  } finally {
    await table.drop();
  }
});

test('a sold-out toggle in the back-office greys the product on an open menu within 5 s', async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name === 'webkit-iphone', 'Back-office half runs on Chromium.');
  const email = `service-${testInfo.project.name}-${String(Date.now())}@example.org`;
  const venueName = `Café Live ${testInfo.project.name.replace(/\D/g, '')}`;
  await newOwnerWithVenue(page, email, venueName);

  const sql = database();
  let slug = '';
  let productId = '';
  try {
    const [restaurant] = await sql<{ id: string; slug: string; public_id: string }[]>`
      select r.id, r.slug, r.public_id from public.restaurants r
      join public.memberships m on m.restaurant_id = r.id
      join auth.users u on u.id = m.user_id where u.email = ${email}`;
    if (!restaurant) throw new Error('venue not found');
    slug = restaurant.slug;
    const [category] = await sql<{ id: string }[]>`
      insert into public.categories (restaurant_id, name, sort_order)
      values (${restaurant.id}, ${sql.json({ fr: 'Boissons' })}, 10) returning id`;
    const [product] = await sql<{ id: string }[]>`
      insert into public.products (restaurant_id, category_id, slug, name, price, sort_order)
      values (${restaurant.id}, ${category?.id ?? ''}, 'citronnade',
        ${sql.json({ fr: 'Citronnade' })}, 4500, 10) returning id`;
    productId = product?.id ?? '';
    await warmUpRealtime(restaurant.public_id);
  } finally {
    await sql.end();
  }

  const customer = await browser.newContext();
  await customer.addCookies(FRENCH);
  try {
    const menu = await customer.newPage();
    await menu.goto(`/${slug}`);
    const card = menu.locator(`[data-product-id="${productId}"]`);
    await expect(card).toHaveAttribute('data-available', 'true');
    // First interaction opens the m: channel (ADR-0008 §5).
    const joined = menu.waitForEvent('websocket');
    await menu.getByRole('heading', { level: 1 }).click();
    const socket = await joined;
    await socket.waitForEvent('framereceived', {
      predicate: (frame) => String(frame.payload).includes('"status":"ok"'),
    });

    await page.goto('/dashboard/menu');
    const availability = page.getByRole('switch', { name: 'Citronnade disponible' });
    await availability.click();
    await expect(availability).toHaveAttribute('aria-checked', 'false');
    await expect(card).toHaveAttribute('data-available', 'false', { timeout: 5000 });
    await expect(card.getByText('Indisponible')).toBeVisible();

    await availability.click();
    await expect(card).toHaveAttribute('data-available', 'true', { timeout: 5000 });
  } finally {
    await customer.close();
  }
});
