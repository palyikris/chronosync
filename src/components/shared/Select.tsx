import React from "react";
import { cn } from "../../utils/cn";
import type { SelectProps } from "../../types/ui";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, leftIcon, label, id, value, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== "";

    return (
      <div className={cn("auth-field", hasValue && "has-value", className)}>
        {leftIcon ? (
          <span
            className="material-symbols-outlined auth-field-icon"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        ) : null}
        <select
          ref={ref}
          id={id}
          value={value}
          className="auth-input appearance-none"
          {...props}
        >
          {children}
        </select>
        {label ? <label htmlFor={id}>{label}</label> : null}
      </div>
    );
  },
);

Select.displayName = "Select";