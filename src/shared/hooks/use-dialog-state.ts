import { useState, useCallback } from "react";

/**
 * Reusable hook for managing dialog open/close state with optional associated data.
 *
 * @example
 * // Simple boolean dialog
 * const confirmDialog = useDialogState();
 * confirmDialog.open();  // opens
 * confirmDialog.close(); // closes
 *
 * @example
 * // Dialog with associated data
 * const deleteDialog = useDialogState<{ id: string; name: string }>();
 * deleteDialog.open({ id: "1", name: "Ubuntu" });
 * deleteDialog.data?.name; // "Ubuntu"
 */
export function useDialogState<T = true>() {
  const [state, setState] = useState<T | null>(null);

  const open = useCallback((value?: T) => {
    setState((value ?? true) as T);
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  return { isOpen: state !== null, data: state, open, close } as const;
}
