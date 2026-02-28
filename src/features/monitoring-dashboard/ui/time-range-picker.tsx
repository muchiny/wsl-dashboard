import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TimeRange } from "@/shared/types/monitoring";

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const { t } = useTranslation();

  const options = useMemo<{ value: TimeRange; label: string }[]>(
    () => [
      { value: "live", label: t("monitoring.timeRangeLive") },
      { value: "1h", label: t("monitoring.timeRange1h") },
      { value: "6h", label: t("monitoring.timeRange6h") },
      { value: "24h", label: t("monitoring.timeRange24h") },
    ],
    [t],
  );
  return (
    <div className="bg-surface-0 flex items-center gap-1 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`focus-ring relative rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-sapphire text-base" : "text-subtext-0 hover:text-text"
          }`}
        >
          {opt.value === "live" && value === "live" && (
            <span className="bg-green mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
