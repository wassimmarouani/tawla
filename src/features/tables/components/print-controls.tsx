'use client';

import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Print button (ADR-0019: "Print / Save as PDF" through the browser). The sheet previews and
 * prints in the light theme whatever the system scheme, like the paper it becomes.
 */
export function PrintControls({ label }: { label: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = 'light';
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, []);

  return (
    <Button
      onClick={() => {
        window.print();
      }}
    >
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
