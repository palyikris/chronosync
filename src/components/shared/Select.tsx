import React from "react";
import { cn } from "../../utils/cn";
import type { SelectProps } from "../../types/ui";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-border-strong bg-transparent px-3 py-2.5 text-sm text-text outline-none transition focus:ring-2 focus:ring-primary-strong disabled:cursor-not-allowed disabled:bg-bg-accent disabled:text-muted",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";