import { toast } from 'sonner';

/** How long an undo stays offered (spec 04): long enough to notice, short enough to settle. */
export const UNDO_DURATION_MS = 5000;

interface UndoToastOptions {
  message: string;
  undoLabel: string;
  /** Shown once the undo succeeded. */
  undoneMessage: string;
  /** Shown when the undo itself failed. */
  failedMessage: string;
  /** Reverts the change; resolves `true` on success. */
  onUndo: () => Promise<boolean>;
}

/**
 * Confirms a reversible change with an "Undo" action (spec 04, P1-04 helper): destructive edits
 * apply at once and stay undoable for a few seconds instead of asking for confirmation.
 */
export function showUndoToast({
  message,
  undoLabel,
  undoneMessage,
  failedMessage,
  onUndo,
}: UndoToastOptions): void {
  toast.success(message, {
    duration: UNDO_DURATION_MS,
    action: {
      label: undoLabel,
      onClick: () => {
        void onUndo().then((ok) => {
          if (ok) toast.success(undoneMessage);
          else toast.error(failedMessage);
        });
      },
    },
  });
}
