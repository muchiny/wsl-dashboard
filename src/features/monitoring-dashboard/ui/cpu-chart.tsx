import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { MetricsPoint } from "../hooks/use-metrics-history";

interface CpuChartProps {
  data: MetricsPoint[];
  loadAverage?: [number, number, number];
}

export function CpuChart({ data, loadAverage }: CpuChartProps) {
  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">CPU Usage</h4>
        {data.length > 0 && (
          <span className="text-blue text-lg font-bold">
            {data[data.length - 1]!.cpu.toFixed(1)}%
          </span>
        )}
      </div>
      {loadAverage && (
        <p className="text-subtext-0 mb-2 text-xs">
          Load: {loadAverage.map((v) => v.toFixed(2)).join(" / ")}
        </p>
      )}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-primary)" stopOpacity={0} />
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
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, "CPU"]}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="var(--color-chart-primary)"
              fill="url(#cpuGrad)"
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
