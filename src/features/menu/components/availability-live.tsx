'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';
import type { RealtimeConfig } from '@/lib/realtime/customer-channel';

/** The `m:` channel closes after 2 min without interaction (ADR-0008 §5). */
const IDLE_MS = 2 * 60 * 1000;
/** Focus refreshes at most this often. */
const FOCUS_REFRESH_MS = 5000;
const INTERACTIONS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const;

interface Availability {
  products: { id: string; isAvailable: boolean }[];
  options: { id: string; isAvailable: boolean }[];
}

/** Elements rendered with `data-product-id` / `data-option-id` and `data-available`. */
function differs(attribute: 'data-product-id' | 'data-option-id', id: string, available: boolean) {
  const element = document.querySelector(`[${attribute}="${CSS.escape(id)}"]`);
  return element !== null && element.getAttribute('data-available') !== String(available);
}

function stale(availability: Availability): boolean {
  return (
    availability.products.some((item) => differs('data-product-id', item.id, item.isAvailable)) ||
    availability.options.some((item) => differs('data-option-id', item.id, item.isAvailable))
  );
}

/**
 * Keeps sold-out states current on the customer menu (spec 02, ADR-0008 §5): the server-rendered
 * menu is checked on focus, and the lazy `m:` channel opens on the first interaction and closes
 * after 2 idle minutes. A difference re-renders the page from the (invalidated) menu cache.
 * Also counts the menu view once per tab (statistics). Inert inside the back-office preview.
 */
export function AvailabilityLive({
  slug,
  menuPublicId,
  tableToken,
  realtime,
}: {
  slug: string;
  menuPublicId: string;
  tableToken?: string | undefined;
  realtime: RealtimeConfig;
}) {
  const router = useRouter();
  const { url, publishableKey } = realtime;

  const onStale = useEffectEvent(() => {
    router.refresh();
  });

  useEffect(() => {
    if (window.self !== window.top) return;

    countView(tableToken ? { token: tableToken } : { slug });

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      // Coalesces bulk toggles into one re-render.
      refreshTimer = setTimeout(onStale, 250);
    };

    let lastCheck = 0;
    const check = async (force = false) => {
      if (!force && Date.now() - lastCheck < FOCUS_REFRESH_MS) return;
      lastCheck = Date.now();
      try {
        const response = await fetch(`/api/public/availability?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        if (response.ok && stale((await response.json()) as Availability)) scheduleRefresh();
      } catch {
        // Offline: the next focus or event tries again.
      }
    };

    let leave: (() => void) | null = null;
    let opening = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      leave?.();
      leave = null;
    };
    const open = () => {
      if (leave || opening) return;
      opening = true;
      void import('@/lib/realtime/customer-channel').then(({ openCustomerChannel }) => {
        opening = false;
        leave = openCustomerChannel({
          config: { url, publishableKey },
          topic: `m:${menuPublicId}`,
          onEvent: (event, payload) => {
            if (event === 'option.availability_changed' || event === 'menu.updated') {
              scheduleRefresh();
              return;
            }
            const { id, is_available: available } = payload;
            if (
              event === 'product.availability_changed' &&
              typeof id === 'string' &&
              typeof available === 'boolean' &&
              differs('data-product-id', id, available)
            ) {
              scheduleRefresh();
            }
          },
          // Refetch on (re)connect: events missed while closed are caught here (§6).
          onStatus: (connected) => {
            if (connected) void check(true);
          },
        });
      });
    };
    const interacted = () => {
      if (document.visibilityState !== 'visible') return;
      open();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(close, IDLE_MS);
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void check();
      else close();
    };

    for (const name of INTERACTIONS) {
      window.addEventListener(name, interacted, { passive: true });
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', visibility);
    return () => {
      for (const name of INTERACTIONS) window.removeEventListener(name, interacted);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', visibility);
      clearTimeout(idleTimer);
      clearTimeout(refreshTimer);
      close();
    };
  }, [slug, menuPublicId, tableToken, url, publishableKey]);

  return null;
}

/** One view per page per tab, sent without delaying anything (statistics, P1-09). */
function countView(body: { slug: string } | { token: string }) {
  const key = `taply:view:${location.pathname}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked: count anyway.
  }
  const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
  if (!navigator.sendBeacon('/api/public/menu-views', blob)) {
    void fetch('/api/public/menu-views', { method: 'POST', body: blob, keepalive: true }).catch(
      () => undefined,
    );
  }
}
