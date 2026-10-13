'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

interface SheetDialogProps {
  /** Id of the sheet title (accessible name). */
  labelledBy: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * Product sheet container (spec 02): a native modal <dialog> (focus trap, Esc, top layer, inert
 * background) styled as a bottom sheet on phones and a centred card from 640 px. The sheet is
 * URL-synced (`?p=`): closing removes the parameter, and Back closes it by changing the URL.
 */
export function SheetDialog({ labelledBy, closeLabel, children }: SheetDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      onClose={() => {
        router.replace(window.location.pathname, { scroll: false });
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="mx-0 mt-auto mb-0 w-full max-w-full overflow-y-auto overscroll-contain rounded-t-lg border-0 bg-card p-0 text-foreground shadow-lg max-h-sheet backdrop:bg-scrim/60 motion-safe:animate-in motion-safe:duration-200 motion-safe:slide-in-from-bottom-8 sm:m-auto sm:max-w-lg sm:rounded-lg"
    >
      <form method="dialog" className="sticky top-0 z-10 flex h-0 justify-end">
        <button
          type="submit"
          aria-label={closeLabel}
          className="me-3 mt-3 grid size-target place-items-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Inline icon: Lucide's runtime would cost the menu bundle more than the glyph. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </form>
      {children}
    </dialog>
  );
}
