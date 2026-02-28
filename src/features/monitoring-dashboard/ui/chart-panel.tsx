import { type ReactNode } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MetricsPoint } from "../hooks/use-metrics-history";

const SKELETON_HEIGHTS = [35, 50, 40, 65, 55, 70, 45, 60, 50, 75, 55, 40];

const TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  fontSize: "12px",
} as const;

const AXIS_TICK = { fontSize: 10, fill: "var(--color-muted-foreground)" };

interface AreaConfig {
  dataKey: string;
  color: string;
  gradientId: string;
  gradientOpacity?: number;
}

interface ChartPanelProps {
  title: string;
  data: MetricsPoint[];
  ariaLabel: string;
  areas: AreaConfig[];
  yDomain?: [number, number];
  yWidth?: number;
  yFormatter?: (value: number) => string;
  tooltipFormatter: (value: number | undefined, name: string | undefined) => [string, string];
  headerValue?: ReactNode;
  subtitle?: ReactNode;
  showLegend?: boolean;
  legendFormatter?: (value: string) => string;
  skeletonHeights?: number[];
}

export function ChartPanel({
  title,
  data,
  ariaLabel,
  areas,
  yDomain,
  yWidth = 35,
  yFormatter = (v) => `${v}%`,
  tooltipFormatter,
  headerValue,
  subtitle,
  showLegend,
  legendFormatter,
  skeletonHeights = SKELETON_HEIGHTS,
}: ChartPanelProps) {
  return (
    <div className="border-surface-1 bg-mantle min-w-0 overflow-hidden rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {headerValue}
      </div>
      {subtitle && <div className="mb-2">{subtitle}</div>}
      <div className="h-40 min-w-0" aria-label={ariaLabel}>
        {data.length === 0 && (
          <div className="flex h-full items-end gap-1.5 px-8 pt-2 pb-4">
            {skeletonHeights.map((h, i) => (
              <div
                key={i}
                className="bg-surface-1 flex-1 animate-pulse rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                {areas.map((area) => (
                  <linearGradient
                    key={area.gradientId}
                    id={area.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={area.color}
                      stopOpacity={area.gradientOpacity ?? 0.3}
                    />
                    <stop offset="95%" stopColor={area.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="time"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                {...(yDomain ? { domain: yDomain } : {})}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={yWidth}
                tickFormatter={yFormatter}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter} />
              {showLegend && legendFormatter && <Legend formatter={legendFormatter} />}
              {areas.map((area) => (
                <Area
                  key={area.dataKey}
                  type="monotone"
                  dataKey={area.dataKey}
                  stroke={area.color}
                  fill={`url(#${area.gradientId})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
