import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Wifi } from "lucide-react";
import { MiniSparkline } from "./mini-sparkline";
import { RingGauge } from "./ring-gauge";
import { formatBytes } from "@/shared/lib/formatters";
import type { MetricsPoint } from "../hooks/use-metrics-history";
import type { SystemMetrics } from "@/shared/types/monitoring";
import { cn } from "@/shared/lib/utils";

interface KpiBannerProps {
  data: MetricsPoint[];
  latestMetrics: SystemMetrics | null;
}

interface GaugeConfig {
  value: number;
  label: string;
  color: string;
  warnAt?: number;
  criticalAt?: number;
}

interface KpiCardProps {
  label: string;
  value?: string;
  valueColor?: string;
  sparklineData: number[];
  sparklineColor: string;
  gauge?: GaugeConfig;
  fallbackIcon?: React.ReactNode;
  subtitle?: string;
}

const KpiCard = memo(function KpiCard({
  label,
  value,
  valueColor,
  sparklineData,
  sparklineColor,
  gauge,
  fallbackIcon,
  subtitle,
}: KpiCardProps) {
  return (
    <div className="bg-surface-0/50 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="shrink-0">
        {gauge ? (
          <RingGauge
            value={gauge.value}
            label={gauge.label}
            color={gauge.color}
            warnAt={gauge.warnAt}
            criticalAt={gauge.criticalAt}
          />
        ) : (
          <div className="text-subtext-0">{fallbackIcon}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-subtext-0 truncate text-[11px] font-medium tracking-wide uppercase">
            {label}
          </span>
          {value && (
            <span className={cn("shrink-0 text-sm font-bold tabular-nums", valueColor)}>
              {value}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <MiniSparkline data={sparklineData} width={56} height={14} color={sparklineColor} />
          {subtitle && (
            <span className="text-subtext-1 shrink-0 text-[10px] tabular-nums">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
});

export const KpiBanner = memo(function KpiBanner({ data, latestMetrics }: KpiBannerProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  const cpuHistory = data.map((d) => d.cpu);
  const memHistory = data.map((d) => d.memPercent);
  const diskPercent = latest?.diskPercent ?? 0;
  const swapPercent = latest?.swapPercent ?? 0;
  const netRx = latest?.netRx ?? 0;
  const netTx = latest?.netTx ?? 0;
  const cpuVal = latest?.cpu ?? 0;
  const memVal = latest?.memPercent ?? 0;

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <KpiCard
        gauge={{ value: cpuVal, label: `${Math.round(cpuVal)}%`, color: "var(--color-blue)" }}
        label={t("monitoring.cpuUsage")}
        sparklineData={cpuHistory}
        sparklineColor="var(--color-blue)"
        subtitle={
          latestMetrics?.cpu.load_average
            ? `LA ${(latestMetrics.cpu.load_average as number[])[0]?.toFixed(1)}`
            : undefined
        }
      />
      <KpiCard
        gauge={{
          value: memVal,
          label: `${Math.round(memVal)}%`,
          color: "var(--color-green)",
          warnAt: 75,
          criticalAt: 90,
        }}
        label={t("monitoring.memoryUsage")}
        sparklineData={memHistory}
        sparklineColor="var(--color-green)"
        subtitle={latest ? `${formatBytes(latest.memUsed)}` : undefined}
      />
      <KpiCard
        gauge={{
          value: diskPercent,
          label: `${Math.round(diskPercent)}%`,
          color: "var(--color-peach)",
          warnAt: 80,
          criticalAt: 90,
        }}
        label={t("monitoring.diskUsage")}
        sparklineData={data.map((d) => d.diskPercent)}
        sparklineColor="var(--color-peach)"
        subtitle={
          latestMetrics?.disk
            ? `${formatBytes(latestMetrics.disk.available_bytes)} ${t("monitoring.free").toLowerCase()}`
            : undefined
        }
      />
      <KpiCard
        gauge={{
          value: swapPercent,
          label: `${Math.round(swapPercent)}%`,
          color: "var(--color-mauve)",
          warnAt: 50,
          criticalAt: 80,
        }}
        label={t("monitoring.swap")}
        sparklineData={data.map((d) => d.swapPercent ?? 0)}
        sparklineColor="var(--color-mauve)"
      />
      <KpiCard
        fallbackIcon={<Wifi className="h-4 w-4" />}
        label={t("monitoring.networkIO")}
        value={data.length < 2 && netRx === 0 && netTx === 0 ? "..." : `${formatBytes(netRx)}/s`}
        valueColor="text-text"
        sparklineData={data.map((d) => d.netRx)}
        sparklineColor="var(--color-sapphire)"
        subtitle={netTx > 0 ? `TX ${formatBytes(netTx)}/s` : undefined}
      />
    </div>
  );
});
