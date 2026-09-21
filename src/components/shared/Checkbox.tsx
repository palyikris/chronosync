import React from "react";
import { cn } from "../../utils/cn";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkbox = (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-border-strong text-primary focus:ring-primary",
          className,
        )}
        {...props}
      />
    );

    if (!label) return checkbox;

    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
        {checkbox}
        <span className="text-sm text-text">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";