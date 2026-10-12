'use client';

import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

interface OfflineBannerProps {
  title: string;
  description: string;
  /** Force the banner (gallery, tests). Defaults to the browser's online status. */
  forceVisible?: boolean;
  className?: string;
}

/**
 * Announces loss of connectivity politely (role="status") and disappears on reconnect.
 * Texts come from the caller (messages files), so the component stays locale-agnostic.
 */
export function OfflineBanner({ title, description, forceVisible, className }: OfflineBannerProps) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online && !forceVisible) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md bg-warning-subtle p-4 text-warning shadow-sm',
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="text-md font-semibold">{title}</p>
        <p className="text-sm">{description}</p>
      </div>
    </div>
  );
}
