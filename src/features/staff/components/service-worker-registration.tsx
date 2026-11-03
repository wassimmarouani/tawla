'use client';

import { useEffect } from 'react';

/**
 * Registers the staff service worker (ADR-0022): Web Push, notification clicks and the offline
 * shell, scoped to /staff. Built by scripts/build-sw.ts into public/sw-staff.js.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw-staff.js', { scope: '/staff' }).catch(() => {
      // No service worker (private mode, unsupported browser): the app still works online.
    });
  }, []);
  return null;
}
