import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import type { DiskMetrics } from "@/shared/types/monitoring";
import type { MetricsPoint } from "../hooks/use-metrics-history";
import { cn } from "@/shared/lib/utils";

interface DiskGaugeProps {
  disk: DiskMetrics | null;
  /** Historical chart data — used to show disk % when live disk data is unavailable */
  historicalData?: MetricsPoint[];
}

export const DiskGauge = memo(function DiskGauge({ disk, historicalData }: DiskGaugeProps) {
  const { t } = useTranslation();

  // In historical mode, derive percent from the latest chart data point
  const histLatest =
    !disk && historicalData && historicalData.length > 0
      ? historicalData[historicalData.length - 1]
      : null;

  const percent = disk?.usage_percent ?? histLatest?.diskPercent ?? 0;
  const hasData = disk !== null || histLatest !== null;
  const isHigh = percent > 80;
  const isCritical = percent > 90;

  return (
    <div className="border-surface-1 bg-mantle min-w-0 overflow-hidden rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t("monitoring.diskUsage")}</h4>
        {hasData && (
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
          <div className="bg-surface-0 mb-2 h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isCritical ? "bg-red" : isHigh ? "bg-yellow" : "bg-blue",
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <div className="text-subtext-0 flex justify-between text-xs">
            <span>
              {t("monitoring.used")} {formatBytes(disk.used_bytes)}
            </span>
            <span>
              {t("monitoring.free")} {formatBytes(disk.available_bytes)}
            </span>
            <span>
              {t("monitoring.total")} {formatBytes(disk.total_bytes)}
            </span>
          </div>
        </>
      )}
      {!disk && histLatest && (
        <>
          <div className="bg-surface-0 mb-2 h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isCritical ? "bg-red" : isHigh ? "bg-yellow" : "bg-blue",
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="text-subtext-0 text-xs">{t("monitoring.historicalAverage")}</p>
        </>
      )}
      {!hasData && (
        <div className="space-y-3 pt-1">
          <div className="bg-surface-0 h-3 overflow-hidden rounded-full">
            <div className="bg-surface-1 h-full w-2/3 animate-pulse rounded-full" />
          </div>
          <div className="flex justify-between">
            <div className="bg-surface-1 h-3 w-16 animate-pulse rounded" />
            <div className="bg-surface-1 h-3 w-16 animate-pulse rounded" />
            <div className="bg-surface-1 h-3 w-16 animate-pulse rounded" />
          </div>
        </div>
      )}
    </div>
  );
});
