import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DialogShell } from "./dialog-shell";

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

  // Focus cancel button on open
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => cancelRef.current?.focus());
  }, [open]);

  const isDanger = variant === "danger";

  return (
    <DialogShell
      open={open}
      onClose={onCancel}
      ariaLabelledby="confirm-title"
      ariaDescribedby="confirm-desc"
      role="alertdialog"
      maxWidth="max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isDanger ? "bg-red/25" : "bg-yellow/25",
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
          className="focus-ring border-surface-1 text-subtext-1 hover:bg-surface-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className={cn(
            "focus-ring rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            isDanger
              ? "bg-red text-crust hover:bg-red/90"
              : "bg-yellow text-crust hover:bg-yellow/90",
          )}
        >
          {isPending ? "..." : confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}
