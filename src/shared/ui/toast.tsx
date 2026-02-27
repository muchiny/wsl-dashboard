import { useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useToastStore } from "./toast-store";
import type { Toast, ToastVariant } from "./toast-store";

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; bg: string; text: string; border: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-green/20",
    text: "text-green",
    border: "border-green/30",
  },
  error: { icon: XCircle, bg: "bg-red/20", text: "text-red", border: "border-red/30" },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow/20",
    text: "text-yellow",
    border: "border-yellow/30",
  },
  info: { icon: Info, bg: "bg-blue/20", text: "text-blue", border: "border-blue/30" },
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (!t.duration) return;
    const timer = setTimeout(onDismiss, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  const config = variantConfig[t.variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "border-surface-1 bg-mantle flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        "animate-in slide-in-from-right fade-in duration-200",
        config.border,
      )}
    >
      <div
        className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", config.bg)}
      >
        <Icon className={cn("h-3.5 w-3.5", config.text)} />
      </div>
      <p className="text-text min-w-0 flex-1 text-sm">{t.message}</p>
      <button
        onClick={onDismiss}
        className="text-subtext-0 hover:text-text shrink-0 p-0.5 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed right-4 bottom-4 z-[100] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
