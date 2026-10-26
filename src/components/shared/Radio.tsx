import React from "react";
import { cn } from "../../utils/cn";

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = id ?? (label ? generatedId : undefined);
    const radio = (
      <input
        ref={ref}
        id={controlId}
        {...props}
        type="radio"
        className={cn(
          "shared-radio h-4 w-4 shrink-0 rounded-full border border-border-strong bg-surface-strong align-middle text-primary transition duration-200 ease-out hover:border-primary-strong/60 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );

    if (!label) return radio;

    return (
      <label
        htmlFor={controlId}
        className={cn(
          "flex items-center gap-2",
          props.disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        )}
      >
        {radio}
        <span className="text-sm text-text">{label}</span>
      </label>
    );
  },
);

Radio.displayName = "Radio";
