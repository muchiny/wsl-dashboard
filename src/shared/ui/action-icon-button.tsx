import { type ComponentPropsWithoutRef, type ElementType } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ActionIconButtonProps extends ComponentPropsWithoutRef<"button"> {
  icon: ElementType;
  loading?: boolean;
  iconClassName?: string;
}

export function ActionIconButton({
  icon: Icon,
  loading = false,
  iconClassName = "h-3.5 w-3.5",
  disabled,
  className,
  ...props
}: ActionIconButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(iconClassName, "animate-spin")} aria-hidden="true" />
      ) : (
        <Icon className={iconClassName} aria-hidden="true" />
      )}
    </button>
  );
}
