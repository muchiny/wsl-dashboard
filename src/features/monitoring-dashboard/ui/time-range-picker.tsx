import type { TimeRange } from "@/shared/types/monitoring";

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const options: { value: TimeRange; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-0)] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-[var(--color-sapphire)] text-[var(--color-base)]"
              : "text-[var(--color-subtext-0)] hover:text-[var(--color-text)]"
          }`}
        >
          {opt.value === "live" && value === "live" && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-green)]" />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
