import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface TcpConnectionsPanelProps {
  data: MetricsPoint[];
}

export const TcpConnectionsPanel = memo(function TcpConnectionsPanel({
  data,
}: TcpConnectionsPanelProps) {
  const { t } = useTranslation();
  const latest = data.length > 0 ? data[data.length - 1] : null;

  const stats = [
    {
      label: t("monitoring.tcpEstablished"),
      value: latest?.tcpEstablished ?? 0,
      color: "text-green",
      bg: "bg-green/15",
    },
    {
      label: t("monitoring.tcpTimeWait"),
      value: latest?.tcpTimeWait ?? 0,
      color: "text-yellow",
      bg: "bg-yellow/15",
    },
    {
      label: t("monitoring.tcpListen"),
      value: latest?.tcpListen ?? 0,
      color: "text-blue",
      bg: "bg-blue/15",
    },
  ];

  return (
    <div className="glass-card shadow-elevation-2 rounded-xl p-4">
      <h4 className="text-text mb-3 text-sm font-semibold">{t("monitoring.tcpConnections")}</h4>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-lg p-3 text-center`}>
            <p className={`${stat.color} text-2xl font-bold tabular-nums`}>{stat.value}</p>
            <p className="text-subtext-0 mt-0.5 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
});
