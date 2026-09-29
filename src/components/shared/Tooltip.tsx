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
          "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-strong bg-white/95 px-2.5 py-1 text-[11px] font-semibold leading-none text-text shadow-lg transition-opacity duration-150",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
};
