import React from "react";
import { cn } from "../../utils/cn";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = id ?? (label ? generatedId : undefined);
    const checkbox = (
      <input
        ref={ref}
        id={controlId}
        {...props}
        type="checkbox"
        className={cn(
          "shared-checkbox h-4 w-4 shrink-0 rounded-md border border-border-strong bg-surface-strong align-middle text-primary transition duration-200 ease-out hover:border-primary-strong/60 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );

    if (!label) return checkbox;

    return (
      <label
        htmlFor={controlId}
        className={cn(
          "flex items-center gap-2",
          props.disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        )}
      >
        {checkbox}
        <span className="text-sm text-text">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
