import React, { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  density?: "default" | "compact";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  density = "default",
}: SegmentedControlProps<T>) {
  const controlRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeOption = optionRefs.current[value];
      const control = controlRef.current;
      if (!activeOption || !control) return;

      setIndicator({
        left: activeOption.offsetLeft,
        width: activeOption.offsetWidth,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    if (controlRef.current) observer.observe(controlRef.current);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div
      ref={controlRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex w-full flex-wrap rounded-2xl border border-border-strong bg-bg-accent p-1 sm:w-auto",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 z-0 rounded-lg bg-primary shadow-[0_2px_4px_rgba(96,120,42,0.18)] transition-[left,width] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)]"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          ref={(element) => {
            optionRefs.current[option.value] = element;
          }}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 min-h-9 flex-1 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-[-0.01em] transition-colors duration-300 sm:flex-none",
            density === "compact" && "min-h-8 rounded-md px-2.5 py-1.5 text-[11px] font-medium",
            value === option.value ? "text-primary-foreground" : "text-muted hover:text-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
