import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface DiskIoChartProps {
  data: MetricsPoint[];
}

export const DiskIoChart = memo(function DiskIoChart({ data }: DiskIoChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <ChartPanel
      title={t("monitoring.diskIo")}
      data={data}
      ariaLabel={t("monitoring.diskIoChartAriaLabel")}
      areas={[
        {
          dataKey: "diskReadRate",
          color: "var(--color-chart-primary)",
          gradientId: "diskReadGrad",
          gradientOpacity: 0.2,
        },
        {
          dataKey: "diskWriteRate",
          color: "var(--color-chart-accent)",
          gradientId: "diskWriteGrad",
          gradientOpacity: 0.2,
        },
      ]}
      yWidth={50}
      yFormatter={(v) => formatBytes(v)}
      headerValue={
        latest ? (
          <span className="text-subtext-0 text-xs">
            {t("monitoring.diskRead")}: {formatBytes(latest.diskReadRate ?? 0)}/s |{" "}
            {t("monitoring.diskWrite")}: {formatBytes(latest.diskWriteRate ?? 0)}/s
          </span>
        ) : undefined
      }
      tooltipFormatter={(value, name) => [
        `${formatBytes(value ?? 0)}/s`,
        name === "diskReadRate" ? t("monitoring.diskRead") : t("monitoring.diskWrite"),
      ]}
      showLegend
      legendFormatter={(value) =>
        value === "diskReadRate" ? t("monitoring.diskRead") : t("monitoring.diskWrite")
      }
    />
  );
});
