'use client';

import { useSyncExternalStore } from 'react';

const WIDE = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

interface DemoPhoneProps {
  src: string;
  title: string;
}

/**
 * Live demo menu in a phone frame, mounted on large screens only: phones get a link instead, so
 * the iframe never costs mobile visitors a second page load.
 */
export function DemoPhone({ src, title }: DemoPhoneProps) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return (
    <div
      aria-hidden={wide ? undefined : true}
      className="relative h-160 w-80 overflow-hidden rounded-xl border-8 border-foreground bg-card shadow-2xl"
    >
      {wide ? <iframe src={src} title={title} className="size-full" /> : null}
    </div>
  );
}
