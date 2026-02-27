import { cn } from "@/shared/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  hideLabel?: boolean;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  hideLabel = false,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-blue" : "bg-surface-1",
        )}
      >
        <span
          className={cn(
            "bg-text absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
      {!hideLabel && (label || description) && (
        <div>
          {label && <p className="text-text text-sm font-medium">{label}</p>}
          {description && <p className="text-subtext-0 text-xs">{description}</p>}
        </div>
      )}
    </div>
  );
}
