/**
 * Staff service worker (ADR-0022), bundled by scripts/build-sw.ts into public/sw-staff.js and
 * registered with scope /staff:
 * - Web Push: shows the notification sent by src/server/admin/push.ts;
 * - notification click: focuses an open staff window or opens the target page;
 * - offline shell: staff pages are network-first, the last copy is shown when offline.
 *   API calls are never cached.
 */

const sw = globalThis as unknown as ServiceWorkerGlobalScope;

const SHELL_CACHE = 'taply-staff-shell-v1';

interface PushPayload {
  title: string;
  body: string;
  /** Same tag replaces the previous notification (one per request). */
  tag?: string;
  url?: string;
}

function parsePayload(data: PushMessageData | null): PushPayload | null {
  if (!data) return null;
  try {
    const value: unknown = data.json();
    if (typeof value !== 'object' || value === null) return null;
    const { title, body, tag, url } = value as Record<string, unknown>;
    if (typeof title !== 'string' || typeof body !== 'string') return null;
    return {
      title,
      body,
      ...(typeof tag === 'string' ? { tag } : {}),
      ...(typeof url === 'string' && url.startsWith('/staff') ? { url } : {}),
    };
  } catch {
    return null;
  }
}

sw.addEventListener('install', () => {
  void sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== SHELL_CACHE).map((name) => caches.delete(name)),
      );
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('push', (event) => {
  const payload = parsePayload(event.data);
  if (!payload) return;
  event.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      ...(payload.tag ? { tag: payload.tag } : {}),
      data: { url: payload.url ?? '/staff' },
      requireInteraction: true,
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const target =
    typeof data === 'object' && data !== null && typeof (data as { url?: unknown }).url === 'string'
      ? (data as { url: string }).url
      : '/staff';
  event.waitUntil(
    (async () => {
      const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).pathname.startsWith('/staff'));
      if (open) {
        await open.focus();
        if (new URL(open.url).pathname !== target) await open.navigate(target);
        return;
      }
      await sw.clients.openWindow(target);
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin || !url.pathname.startsWith('/staff')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) ?? (await cache.match('/staff')) ?? Response.error();
      }
    })(),
  );
});

export {};
