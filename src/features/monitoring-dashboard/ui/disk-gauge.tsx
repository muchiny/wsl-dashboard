import { formatBytes } from "@/shared/lib/formatters";
import type { DiskMetrics } from "@/shared/types/monitoring";
import { cn } from "@/shared/lib/utils";

interface DiskGaugeProps {
  disk: DiskMetrics | null;
}

export function DiskGauge({ disk }: DiskGaugeProps) {
  const percent = disk?.usage_percent ?? 0;
  const isHigh = percent > 80;
  const isCritical = percent > 90;

  return (
    <div className="rounded-xl border border-surface-1 bg-mantle p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Disk Usage</h4>
        {disk && (
          <span
            className={cn(
              "text-lg font-bold",
              isCritical ? "text-red" : isHigh ? "text-yellow" : "text-subtext-0",
            )}
          >
            {percent.toFixed(1)}%
          </span>
        )}
      </div>
      {disk && (
        <>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-surface-0">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isCritical ? "bg-red" : isHigh ? "bg-yellow" : "bg-blue",
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-subtext-0">
            <span>Used: {formatBytes(disk.used_bytes)}</span>
            <span>Free: {formatBytes(disk.available_bytes)}</span>
            <span>Total: {formatBytes(disk.total_bytes)}</span>
          </div>
        </>
      )}
      {!disk && <p className="text-sm text-subtext-0">No data available</p>}
    </div>
  );
}
