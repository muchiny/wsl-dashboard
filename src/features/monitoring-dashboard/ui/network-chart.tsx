import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import { ChartPanel } from "./chart-panel";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface NetworkChartProps {
  data: MetricsPoint[];
  showTcp?: boolean;
}

export const NetworkChart = memo(function NetworkChart({ data, showTcp }: NetworkChartProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  const tcpEstablished = latest?.tcpEstablished ?? 0;
  const tcpTimeWait = latest?.tcpTimeWait ?? 0;
  const tcpListen = latest?.tcpListen ?? 0;
  const hasTcp = showTcp && (tcpEstablished > 0 || tcpTimeWait > 0 || tcpListen > 0);

  return (
    <div className="min-w-0 space-y-2">
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
      {hasTcp && (
        <div className="flex gap-2">
          <span className="bg-green/10 text-green inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums">
            {tcpEstablished} {t("monitoring.tcpEstablished")}
          </span>
          <span className="bg-yellow/10 text-yellow inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums">
            {tcpTimeWait} {t("monitoring.tcpTimeWait")}
          </span>
          <span className="bg-blue/10 text-blue inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums">
            {tcpListen} {t("monitoring.tcpListen")}
          </span>
        </div>
      )}
    </div>
  );
});
