import React, { useState } from "react";
import { cn } from "../../utils/cn";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2.5 py-1.5 text-[10px] font-semibold leading-none text-white shadow-lg transition-all duration-150",
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
};
