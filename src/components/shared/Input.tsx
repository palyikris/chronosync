import React from "react";
import { cn } from "../../utils/cn";
import type { InputProps } from "../../types/ui";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, leftIcon, rightIcon, label, id, value, placeholder, ...props },
    ref,
  ) => {
    const hasValue = value !== undefined && value !== null && value !== "";
    const isDateInput = props.type === "date";

    if (isDateInput && label) {
      return (
        <div className={cn("flex flex-col gap-1", className)}>
          <label htmlFor={id} className="text-xs font-semibold text-muted">
            {label}
          </label>
          <input
            ref={ref}
            id={id}
            value={value}
            placeholder={placeholder}
            className="auth-input"
            {...props}
          />
        </div>
      );
    }

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
        <input
          ref={ref}
          id={id}
          value={value}
          placeholder={placeholder ?? " "}
          className="auth-input"
          {...props}
        />
        {label ? <label htmlFor={id}>{label}</label> : null}
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