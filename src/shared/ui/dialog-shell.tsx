import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  ariaLabelledby: string;
  ariaDescribedby?: string;
  role?: "dialog" | "alertdialog";
  maxWidth?: string;
  className?: string;
  children: ReactNode;
}

export function DialogShell({
  open,
  onClose,
  ariaLabelledby,
  ariaDescribedby,
  role = "dialog",
  maxWidth = "max-w-sm",
  className,
  children,
}: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus first focusable element on open
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.[0]?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="bg-crust/80 animate-in fade-in fixed inset-0 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        className={cn(
          "border-surface-1 bg-mantle animate-in zoom-in-95 fade-in relative z-10 mx-4 w-full rounded-2xl border p-6 shadow-2xl",
          maxWidth,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
