import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface SwapChartProps {
  data: MetricsPoint[];
}

export const SwapChart = memo(function SwapChart({ data }: SwapChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <ChartPanel
      title={t("monitoring.swapUsage")}
      data={data}
      ariaLabel={t("monitoring.swapChartAriaLabel")}
      yDomain={[0, 100]}
      areas={[
        {
          dataKey: "swapPercent",
          color: "var(--color-mauve)",
          gradientId: "swapGrad",
        },
      ]}
      headerValue={
        latest?.swapPercent != null ? (
          <span className="text-mauve text-lg font-bold">{latest.swapPercent.toFixed(1)}%</span>
        ) : undefined
      }
      tooltipFormatter={(value) => [`${(value ?? 0).toFixed(1)}%`, t("monitoring.swap")]}
    />
  );
});
