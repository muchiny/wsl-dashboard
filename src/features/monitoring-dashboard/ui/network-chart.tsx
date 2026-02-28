import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface NetworkChartProps {
  data: MetricsPoint[];
}

export const NetworkChart = memo(function NetworkChart({ data }: NetworkChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <ChartPanel
      title={t("monitoring.networkIO")}
      data={data}
      ariaLabel={t("monitoring.networkChartAriaLabel")}
      areas={[
        {
          dataKey: "netRx",
          color: "var(--color-chart-primary)",
          gradientId: "rxGrad",
          gradientOpacity: 0.2,
        },
        {
          dataKey: "netTx",
          color: "var(--color-chart-accent)",
          gradientId: "txGrad",
          gradientOpacity: 0.2,
        },
      ]}
      yWidth={50}
      yFormatter={(v) => formatBytes(v)}
      headerValue={
        latest ? (
          <span className="text-subtext-0 text-xs">
            {data.length < 2 && latest.netRx === 0 && latest.netTx === 0
              ? t("monitoring.calculating")
              : `RX: ${formatBytes(latest.netRx)}/s | TX: ${formatBytes(latest.netTx)}/s`}
          </span>
        ) : undefined
      }
      tooltipFormatter={(value, name) => [
        `${formatBytes(value ?? 0)}/s`,
        name === "netRx" ? t("monitoring.download") : t("monitoring.upload"),
      ]}
      showLegend
      legendFormatter={(value) =>
        value === "netRx" ? t("monitoring.download") : t("monitoring.upload")
      }
      skeletonHeights={[20, 30, 15, 40, 25, 35, 20, 45, 30, 15, 25, 35]}
    />
  );
});
