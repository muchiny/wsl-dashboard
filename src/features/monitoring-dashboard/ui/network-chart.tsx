import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatBytes } from "@/shared/lib/formatters";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface NetworkChartProps {
  data: MetricsPoint[];
}

export function NetworkChart({ data }: NetworkChartProps) {
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="rounded-xl border border-surface-1 bg-mantle p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Network I/O</h4>
        {latest && (
          <span className="text-xs text-subtext-0">
            RX: {formatBytes(latest.netRx)}/s | TX: {formatBytes(latest.netTx)}/s
          </span>
        )}
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-chart-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-chart-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(v: number) => formatBytes(v)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number | undefined, name: string | undefined) => [
                `${formatBytes(value ?? 0)}/s`,
                name === "netRx" ? "Download" : "Upload",
              ]}
            />
            <Legend formatter={(value: string) => (value === "netRx" ? "Download" : "Upload")} />
            <Area
              type="monotone"
              dataKey="netRx"
              stroke="var(--color-chart-primary)"
              fill="url(#rxGrad)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="netTx"
              stroke="var(--color-chart-accent)"
              fill="url(#txGrad)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
