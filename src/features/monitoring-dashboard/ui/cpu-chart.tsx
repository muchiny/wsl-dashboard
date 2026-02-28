import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface CpuChartProps {
  data: MetricsPoint[];
  loadAverage?: [number, number, number];
}

export const CpuChart = memo(function CpuChart({ data, loadAverage }: CpuChartProps) {
  const { t } = useTranslation();

  return (
    <ChartPanel
      title={t("monitoring.cpuUsage")}
      data={data}
      ariaLabel={t("monitoring.cpuChartAriaLabel")}
      yDomain={[0, 100]}
      areas={[
        {
          dataKey: "cpu",
          color: "var(--color-chart-primary)",
          gradientId: "cpuGrad",
        },
      ]}
      headerValue={
        data.length > 0 ? (
          <span className="text-blue text-lg font-bold">
            {data[data.length - 1]!.cpu.toFixed(1)}%
          </span>
        ) : undefined
      }
      subtitle={
        loadAverage ? (
          <p className="text-subtext-0 text-xs">
            {t("monitoring.load")} {loadAverage.map((v) => v.toFixed(2)).join(" / ")}
          </p>
        ) : undefined
      }
      tooltipFormatter={(value) => [`${(value ?? 0).toFixed(1)}%`, t("monitoring.cpuTooltip")]}
    />
  );
});
