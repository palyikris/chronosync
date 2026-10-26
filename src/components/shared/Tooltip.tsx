import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!isVisible || !content) return;
    const updatePosition = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const bounds = anchor.getBoundingClientRect();
      const { width, height } = tooltip.getBoundingClientRect();
      const inset = 8;
      const left = Math.max(inset, Math.min(
        bounds.left + (bounds.width - width) / 2,
        window.innerWidth - width - inset,
      ));
      const below = bounds.bottom + inset;
      const top = below + height <= window.innerHeight - inset
        ? below : Math.max(inset, bounds.top - height - inset);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isVisible, content]);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span
      ref={anchorRef}
      className={cn("inline-flex", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onKeyDown={(event) => { if (event.key === "Escape") setIsVisible(false); }}
    >
      {React.isValidElement<{ "aria-describedby"?: string }>(children)
        ? React.cloneElement(children, {
          "aria-describedby": [children.props["aria-describedby"], isVisible ? tooltipId : null].filter(Boolean).join(" ") || undefined,
        }) : children}
      {isVisible ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[100] max-w-[min(20rem,calc(100vw-1rem))] rounded-lg bg-text px-2.5 py-2 text-[11px] font-medium leading-4 text-white shadow-lg [overflow-wrap:anywhere]"
        >
          {content}
        </span>,
        document.body,
      ) : null}
    </span>
  );
};
