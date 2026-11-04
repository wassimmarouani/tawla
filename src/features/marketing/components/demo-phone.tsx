'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const WIDE = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

interface DemoPhoneProps {
  src: string | null;
  title: string;
  /** Drawn menu shown on phones and tablets, and before the live frame loads. */
  fallback: ReactNode;
}

/**
 * Phone frame of the hero. Large screens run the live demo menu in an iframe; smaller screens
 * keep the drawn menu, so the iframe never costs mobile visitors a second page load.
 */
export function DemoPhone({ src, title, fallback }: DemoPhoneProps) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return (
    <div className="relative h-136 w-68 overflow-hidden rounded-xl border-8 border-foreground bg-card shadow-2xl sm:h-160 sm:w-80">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-2 z-10 mx-auto h-1.5 w-16 rounded-full bg-foreground/80"
      />
      {wide && src ? <iframe src={src} title={title} className="size-full" /> : fallback}
    </div>
  );
}
