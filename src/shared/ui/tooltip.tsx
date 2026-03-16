import {
  type ReactNode,
  type CSSProperties,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({ content, children, position = "bottom" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;

    // Compute the center-x of the trigger and the vertical offset.
    // We set `left` to the center of the trigger and rely on
    // `translate: -50%` (via Tailwind) to horizontally center the bubble.
    const centerX = rect.left + rect.width / 2;

    if (position === "bottom") {
      setCoords({
        top: rect.bottom + gap,
        left: centerX,
      });
    } else {
      setCoords({
        top: rect.top - gap,
        left: centerX,
      });
    }
  }, [visible, position]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              "tooltip-bubble shadow-elevation-2 pointer-events-none fixed z-[9999] -translate-x-1/2 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap",
              position === "top" && "-translate-y-full",
            )}
            style={coords}
          >
            {content}
            <span
              className={cn(
                "tooltip-arrow absolute left-1/2 -translate-x-1/2",
                position === "bottom" ? "-top-1" : "-bottom-1",
              )}
            />
          </div>,
          document.body,
        )}
    </span>
  );
}
