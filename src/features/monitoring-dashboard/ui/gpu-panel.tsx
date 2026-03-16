import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/shared/lib/formatters";
import type { GpuMetrics } from "@/shared/types/monitoring";

interface GpuPanelProps {
  gpu: GpuMetrics | undefined;
}

export const GpuPanel = memo(function GpuPanel({ gpu }: GpuPanelProps) {
  const { t } = useTranslation();

  if (!gpu) return null;

  const utilization = gpu.utilization_percent ?? 0;
  const vramUsed = gpu.vram_used_bytes ?? 0;
  const vramTotal = gpu.vram_total_bytes ?? 0;
  const vramPercent = vramTotal > 0 ? (vramUsed / vramTotal) * 100 : 0;

  const getBarColor = (pct: number) => {
    if (pct >= 90) return "bg-red";
    if (pct >= 70) return "bg-yellow";
    return "bg-green";
  };

  return (
    <div className="glass-card shadow-elevation-2 rounded-xl p-4">
      <h4 className="text-text mb-3 text-sm font-semibold">{t("monitoring.gpu")}</h4>
      <div className="space-y-3">
        {/* GPU Utilization */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-subtext-0 text-xs">{t("monitoring.gpuUtilization")}</span>
            <span className="text-text text-sm font-bold tabular-nums">
              {utilization.toFixed(1)}%
            </span>
          </div>
          <div className="bg-surface-0 h-2.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(utilization)}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>

        {/* VRAM */}
        {vramTotal > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-subtext-0 text-xs">{t("monitoring.gpuVram")}</span>
              <span className="text-text text-sm font-bold tabular-nums">
                {formatBytes(vramUsed)} / {formatBytes(vramTotal)}
              </span>
            </div>
            <div className="bg-surface-0 h-2.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(vramPercent)}`}
                style={{ width: `${Math.min(vramPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
