import React from "react";
import { cn } from "../../utils/cn";
import type { ButtonProps, ButtonSize, ButtonVariant } from "../../types/ui";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]",
  secondary: "bg-surface-strong text-text hover:bg-bg-accent shadow-sm",
  ghost: "bg-transparent text-text hover:bg-border",
  outline: "border border-border-strong bg-transparent text-text hover:bg-bg-accent",
  danger: "bg-danger text-white hover:opacity-90",
  dashed:
    "border-2 border-dashed border-primary-strong text-primary-strong hover:bg-primary/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-9 w-9 p-0",
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
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(props.disabled);
    const showIconSwap = Boolean(icon && children && !isDisabled);
    const buttonClasses = cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ease-out disabled:opacity-50",
      showIconSwap
        ? "group relative overflow-hidden [perspective:1000px] cursor-pointer hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md active:scale-[0.98]"
        : isDisabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md active:scale-[0.98]",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    return (
      <button ref={ref} type={type} className={buttonClasses} {...props}>
        {showIconSwap ? (
          <>
            <span className="pointer-events-none invisible whitespace-nowrap opacity-0">
              {children}
            </span>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center transform-3d transition-transform duration-300 ease-out group-hover:transform-[rotateX(180deg)]">
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center backface-hidden transition-opacity duration-200 group-hover:opacity-0"
              >
                {icon}
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center transform-[rotateX(180deg)] backface-hidden"
              >
                {children}
              </span>
            </span>
          </>
        ) : (
          <>
            {icon ? <span aria-hidden="true">{icon}</span> : null}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";