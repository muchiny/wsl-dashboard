import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import { ChartPanel } from "./chart-panel";
import { cn } from "@/shared/lib/utils";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface MemoryChartProps {
  data: MetricsPoint[];
  showSwap?: boolean;
}

export const MemoryChart = memo(function MemoryChart({ data, showSwap }: MemoryChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const swapPercent = latest?.swapPercent ?? 0;
  const hasSwap = showSwap && swapPercent > 0;

  return (
    <div className="min-w-0 space-y-2">
      <ChartPanel
        title={t("monitoring.memoryUsage")}
        data={data}
        ariaLabel={t("monitoring.memoryChartAriaLabel")}
        yDomain={[0, 100]}
        areas={[
          {
            dataKey: "memPercent",
            color: "var(--color-chart-success)",
            gradientId: "memGrad",
          },
        ]}
        headerValue={
          latest ? (
            <span className="text-green text-lg font-bold">{latest.memPercent.toFixed(1)}%</span>
          ) : undefined
        }
        subtitle={
          latest ? (
            <p className="text-subtext-0 text-xs">
              {formatBytes(latest.memUsed)} / {formatBytes(latest.memTotal)}
            </p>
          ) : undefined
        }
        tooltipFormatter={(value) => [`${(value ?? 0).toFixed(1)}%`, t("monitoring.memoryTooltip")]}
        skeletonHeights={[60, 62, 58, 65, 63, 60, 64, 61, 63, 59, 62, 64]}
      />
      {hasSwap && (
        <div className="bg-surface-0/50 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="text-subtext-0 text-xs font-medium">{t("monitoring.swap")}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                swapPercent >= 80 ? "bg-red" : swapPercent >= 50 ? "bg-yellow" : "bg-mauve",
              )}
              style={{ width: `${Math.min(swapPercent, 100)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              swapPercent >= 80 ? "text-red" : swapPercent >= 50 ? "text-yellow" : "text-mauve",
            )}
          >
            {swapPercent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
});
