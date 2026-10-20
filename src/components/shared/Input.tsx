import React from "react";
import { cn } from "../../utils/cn";
import type { InputProps } from "../../types/ui";
import { Badge, Clock3, FolderOpen, History, Languages, User } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  person: <User className="h-4 w-4" />,
  badge: <Badge className="h-4 w-4" />,
  translate: <Languages className="h-4 w-4" />,
  schedule: <Clock3 className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  folder_open: <FolderOpen className="h-4 w-4" />,
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, leftIcon, rightIcon, label, id, value, placeholder, ...props },
    ref,
  ) => {
    const hasValue = value !== undefined && value !== null && value !== "";
    const isDateInput = props.type === "date";
    const hasFloatingPlaceholder = Boolean(label && placeholder);

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
          <span className="auth-field-icon" aria-hidden="true">
            {typeof leftIcon === "string" ? iconMap[leftIcon] : leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          value={value}
          placeholder={placeholder ?? " "}
          className={cn(
            "auth-input",
            hasFloatingPlaceholder && "auth-input-floating-placeholder",
          )}
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
