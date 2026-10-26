import React from "react";
import { cn } from "../../utils/cn";
import type { ButtonProps, ButtonSize, ButtonVariant } from "../../types/ui";
import { Tooltip } from "./Tooltip";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-primary-strong/35 bg-primary text-primary-foreground font-semibold shadow-[0_2px_4px_rgba(96,120,42,0.22)] hover:brightness-[1.02]",
  secondary: "border border-border-strong bg-surface-strong/80 text-text shadow-[0_1px_2px_rgba(75,87,57,0.05)] hover:bg-white",
  ghost: "border border-transparent bg-transparent text-muted-strong hover:bg-black/[0.045] hover:text-text",
  outline: "border border-border-strong bg-white/45 text-text shadow-[0_1px_1px_rgba(75,87,57,0.035)] hover:bg-white/80",
  danger: "border border-danger/15 bg-danger text-white shadow-[0_1px_2px_rgba(120,67,54,0.16)] hover:brightness-95",
  dashed:
    "border border-dashed border-primary-strong/40 bg-primary/5 text-primary-strong hover:bg-primary/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-[12px] sm:min-h-8 sm:px-2.5 sm:text-[11.5px]",
  md: "min-h-11 px-3.5 text-[13px] sm:min-h-8 sm:px-3 sm:text-[12px]",
  lg: "min-h-11 px-4 text-[13px] sm:min-h-9 sm:px-3.5 sm:text-[12px]",
  icon: "h-11 min-h-11 w-11 p-0 sm:h-8 sm:min-h-8 sm:w-8",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      icon,
      children,
      tooltip,
      title,
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(props.disabled);
    const buttonClasses = cn(
      "ui-control group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] font-[500] leading-none tracking-[-0.012em] transition-[background-color,border-color,box-shadow,filter,transform] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)] [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:stroke-[1.8] disabled:opacity-45",
      isDisabled
        ? "cursor-not-allowed"
        : "cursor-pointer active:scale-[0.99]",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    const button = (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        title={tooltip ? undefined : title}
        {...props}
      >
        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.8]"
          >
            {icon}
          </span>
        ) : null}
        {children ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:stroke-[1.8]">
            {children}
          </span>
        ) : null}
      </button>
    );

    if (!tooltip) {
      return button;
    }

    return <Tooltip content={tooltip}>{button}</Tooltip>;
  },
);

Button.displayName = "Button";
