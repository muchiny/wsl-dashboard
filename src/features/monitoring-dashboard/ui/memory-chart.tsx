import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface MemoryChartProps {
  data: MetricsPoint[];
}

export const MemoryChart = memo(function MemoryChart({ data }: MemoryChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
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
  );
});
