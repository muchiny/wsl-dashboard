import { useState, useCallback } from "react";
import { useTauriEvent } from "@/shared/hooks/use-tauri-event";

interface AlertEvent {
  distro_name: string;
  alert_type: string;
  threshold: number;
  actual_value: number;
}

/**
 * Badge showing unacknowledged alert count.
 * Listens to "alert-triggered" Tauri events in real-time.
 */
export function AlertBadge() {
  const [count, setCount] = useState(0);

  const handler = useCallback((_event: AlertEvent) => {
    setCount((prev) => prev + 1);
  }, []);

  useTauriEvent<AlertEvent>("alert-triggered", handler);

  if (count === 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-red)] px-1 text-[10px] font-bold text-[var(--color-base)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
