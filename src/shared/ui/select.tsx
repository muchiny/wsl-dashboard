import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Build the full list of items (placeholder + options)
  const allItems = placeholder ? [{ value: "", label: placeholder }, ...options] : options;

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const selectItem = useCallback(
    (itemValue: string) => {
      onChange(itemValue);
      close();
    },
    [onChange, close],
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, close]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const optionEl = listboxRef.current?.querySelector(`[id="select-option-${highlightedIndex}"]`);
    optionEl?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((i) => Math.min(i + 1, allItems.length - 1));
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(allItems.length - 1);
        } else {
          setHighlightedIndex((i) => Math.max(i - 1, 0));
        }
        break;
      }
      case "Home": {
        if (open) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      }
      case "End": {
        if (open) {
          e.preventDefault();
          setHighlightedIndex(allItems.length - 1);
        }
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (open && highlightedIndex >= 0) {
          const item = allItems[highlightedIndex];
          if (item) selectItem(item.value);
        } else if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        }
        break;
      }
      case "Escape": {
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      }
      case "Tab": {
        if (open) {
          close();
        }
        break;
      }
    }
  };

  const activeDescendant =
    open && highlightedIndex >= 0 ? `select-option-${highlightedIndex}` : undefined;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (open) {
            close();
          } else {
            setOpen(true);
            setHighlightedIndex(0);
          }
        }}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={activeDescendant}
        className={cn(
          "border-surface-1 bg-base text-text flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
          "focus-ring hover:border-surface-2",
          open && "border-blue",
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-overlay-0")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "text-overlay-0 ml-2 h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          ref={listboxRef}
          role="listbox"
          className="bg-surface-0 border-surface-1 absolute top-full left-0 z-50 mt-1 max-h-60 w-full min-w-[160px] overflow-y-auto rounded-lg border py-1 shadow-lg"
        >
          {allItems.map((item, index) => {
            const isSelected = item.value === value || (!item.value && !value);
            const isHighlighted = highlightedIndex === index;
            const isPlaceholder = index === 0 && !!placeholder && item.value === "";

            return (
              <button
                key={item.value || "__placeholder__"}
                id={`select-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectItem(item.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                  isSelected ? "text-blue" : isPlaceholder ? "text-overlay-0" : "text-subtext-1",
                  isHighlighted && "bg-surface-1 text-text",
                  !isHighlighted && !isSelected && "hover:bg-surface-1 hover:text-text",
                )}
              >
                <Check
                  className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
