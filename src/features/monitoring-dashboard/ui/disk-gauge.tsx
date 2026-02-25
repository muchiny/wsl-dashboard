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
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Disk Usage</h4>
        {disk && (
          <span
            className={cn(
              "text-lg font-bold",
              isCritical ? "text-destructive" : isHigh ? "text-warning" : "text-muted-foreground",
            )}
          >
            {percent.toFixed(1)}%
          </span>
        )}
      </div>
      {disk && (
        <>
          <div className="bg-muted mb-2 h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isCritical ? "bg-destructive" : isHigh ? "bg-warning" : "bg-primary",
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Used: {formatBytes(disk.used_bytes)}</span>
            <span>Free: {formatBytes(disk.available_bytes)}</span>
            <span>Total: {formatBytes(disk.total_bytes)}</span>
          </div>
        </>
      )}
      {!disk && <p className="text-muted-foreground text-sm">No data available</p>}
    </div>
  );
}
