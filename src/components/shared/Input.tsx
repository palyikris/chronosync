import React from "react";
import { cn } from "../../utils/cn";
import type { InputProps } from "../../types/ui";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-border-strong bg-transparent px-3 py-2.5 text-sm text-text outline-none transition focus:ring-2 focus:ring-primary-strong",
            !!leftIcon && "pl-9",
            !!rightIcon && "pr-9",
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";