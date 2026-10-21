import React, { useEffect, useState, useRef } from "react";
import { cn } from "../../utils/cn"; // Using your existing Tailwind merge utility

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: Intl.LocalesArgument;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500, // Animation duration in milliseconds
  decimals = 0,
  prefix = "",
  suffix = "",
  locale,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const displayValueRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion || duration <= 0) {
      animationFrameId = requestAnimationFrame(() => {
        displayValueRef.current = value;
        setDisplayValue(value);
      });
      return () => cancelAnimationFrame(animationFrameId);
    }

    let startTime: number;
    const startValue = displayValueRef.current;
    const distance = value - startValue;

    // Easing function (ease-out exponential) for a natural slow-down effect
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const updateCounter = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const currentValue = startValue + distance * easedProgress;
      displayValueRef.current = currentValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        // Guarantee we end on the exact target value
        displayValueRef.current = value;
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  // Format the number dynamically based on the user's locale (handles commas/decimals)
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(displayValue);

  return (
    <span className={cn("font-medium tabular-nums", className)}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};
