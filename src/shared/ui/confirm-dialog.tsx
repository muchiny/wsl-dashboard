import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isPending = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus cancel button on open + trap focus
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="bg-crust/80 animate-in fade-in fixed inset-0 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="border-surface-1 bg-mantle animate-in zoom-in-95 fade-in relative z-10 mx-4 w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isDanger ? "bg-red/15" : "bg-yellow/15",
            )}
          >
            <AlertTriangle className={cn("h-5 w-5", isDanger ? "text-red" : "text-yellow")} />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-text text-base font-semibold">
              {title}
            </h3>
            <p id="confirm-desc" className="text-subtext-0 mt-1 text-sm">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isPending}
            className="border-surface-1 text-subtext-1 hover:bg-surface-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              isDanger
                ? "bg-red text-crust hover:bg-red/90"
                : "bg-yellow text-crust hover:bg-yellow/90",
            )}
          >
            {isPending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
