import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { MiniSparkline } from "./mini-sparkline";
import { cn } from "@/shared/lib/utils";

interface PerCoreChartProps {
  perCoreHistory: number[][];
  currentValues: number[];
}

function getCoreColor(value: number): string {
  if (value >= 90) return "var(--color-red)";
  if (value >= 70) return "var(--color-yellow)";
  return "var(--color-blue)";
}

export const PerCoreChart = memo(function PerCoreChart({
  perCoreHistory,
  currentValues,
}: PerCoreChartProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (currentValues.length === 0) return null;

  const maxCore = Math.max(...currentValues);
  const avgCore = currentValues.reduce((a, b) => a + b, 0) / currentValues.length;

  return (
    <div className="glass-card shadow-elevation-2 rounded-xl p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="focus-ring flex w-full items-center justify-between rounded-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <h4 className="text-text text-sm font-semibold">{t("monitoring.perCoreCpu")}</h4>
          <span className="text-subtext-0 text-xs tabular-nums">
            {currentValues.length} {t("monitoring.cores")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!expanded && (
            <div className="flex items-center gap-2">
              <span className="text-subtext-0 text-xs">
                {t("monitoring.avg")}{" "}
                <span className="text-text font-medium tabular-nums">{avgCore.toFixed(0)}%</span>
              </span>
              <span className="text-subtext-0 text-xs">
                {t("monitoring.max")}{" "}
                <span className="font-medium tabular-nums" style={{ color: getCoreColor(maxCore) }}>
                  {maxCore.toFixed(0)}%
                </span>
              </span>
              {/* Compact bar preview */}
              <div className="flex items-end gap-px">
                {currentValues.map((v, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-t transition-all"
                    style={{
                      height: `${Math.max(4, (v / 100) * 16)}px`,
                      backgroundColor: getCoreColor(v),
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <ChevronDown
            className={cn("text-subtext-0 h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </div>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {currentValues.map((value, i) => {
            const history = perCoreHistory[i] ?? [];
            return (
              <div
                key={i}
                className="bg-surface-0/50 flex items-center gap-1.5 rounded-lg px-2 py-1.5"
              >
                <span className="text-subtext-1 w-5 shrink-0 text-[10px] font-medium">C{i}</span>
                <MiniSparkline data={history} width={48} height={16} color={getCoreColor(value)} />
                <span
                  className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums"
                  style={{ color: getCoreColor(value) }}
                >
                  {value.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
