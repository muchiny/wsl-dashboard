import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatBytes } from "@/shared/lib/formatters";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface MemoryChartProps {
  data: MetricsPoint[];
}

export function MemoryChart({ data }: MemoryChartProps) {
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Memory Usage</h4>
        {latest && (
          <span className="text-green text-lg font-bold">{latest.memPercent.toFixed(1)}%</span>
        )}
      </div>
      {latest && (
        <p className="text-subtext-0 mb-2 text-xs">
          {formatBytes(latest.memUsed)} / {formatBytes(latest.memTotal)}
        </p>
      )}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-success)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-success)" stopOpacity={0} />
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
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={35}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, "Memory"]}
            />
            <Area
              type="monotone"
              dataKey="memPercent"
              stroke="var(--color-chart-success)"
              fill="url(#memGrad)"
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
