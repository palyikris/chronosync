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
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeOption = optionRefs.current[value];
      const control = controlRef.current;
      if (!activeOption || !control) return;

      const activeBounds = activeOption.getBoundingClientRect();
      const controlBounds = control.getBoundingClientRect();
      const nextIndicator = {
        left: activeBounds.left - controlBounds.left - control.clientLeft,
        top: activeBounds.top - controlBounds.top - control.clientTop,
        width: activeBounds.width,
        height: activeBounds.height,
      };
      setIndicator(current =>
        current.left === nextIndicator.left && current.top === nextIndicator.top &&
        current.width === nextIndicator.width && current.height === nextIndicator.height
          ? current : nextIndicator);
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
      aria-orientation="horizontal"
      className={cn(
        "relative inline-flex w-full flex-wrap rounded-2xl border border-border-strong bg-bg-accent p-1 sm:w-auto",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-0 rounded-lg bg-primary shadow-[0_2px_4px_rgba(96,120,42,0.18)] transition-[left,top,width,height] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)] motion-reduce:transition-none"
        style={indicator}
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
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            const index = options.findIndex(candidate => candidate.value === option.value);
            const nextIndex = event.key === "Home" ? 0
              : event.key === "End" ? options.length - 1
              : event.key === "ArrowRight" ? (index + 1) % options.length
              : event.key === "ArrowLeft" ? (index + options.length - 1) % options.length
              : null;
            if (nextIndex === null) return;
            event.preventDefault();
            const nextValue = options[nextIndex].value;
            onChange(nextValue);
            optionRefs.current[nextValue]?.focus();
          }}
          className={cn(
            "relative z-10 inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold tracking-[-0.01em] transition-colors duration-300 sm:flex-none",
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
