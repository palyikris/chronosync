import React, { useEffect, useState, useRef } from "react";
import { cn } from "../../utils/cn"; // Using your existing Tailwind merge utility

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500, // Animation duration in milliseconds
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  // Track the previous value so it animates from old -> new on updates
  const startValueRef = useRef(0);

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;
    const startValue = startValueRef.current;
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
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        // Guarantee we end on the exact target value
        setDisplayValue(value);
        startValueRef.current = value;
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  // Format the number dynamically based on the user's locale (handles commas/decimals)
  const formattedNumber = new Intl.NumberFormat(undefined, {
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
