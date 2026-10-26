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
          "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2.5 py-1.5 text-[10px] font-semibold leading-none text-white shadow-lg transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)]",
          isVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-0.5 scale-[0.98] opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
};
