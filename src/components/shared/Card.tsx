import React from "react";
import { cn } from "../../utils/cn";
import type { CardProps } from "../../types/ui";

export const Card: React.FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface-strong/88 shadow-card backdrop-blur-xl transition-[box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,0.7,0.24,1)]",
        className,
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("border-b border-primary-strong/20 bg-primary/15 px-5 py-3.5", className)} {...props} />
);

export const CardTitle: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("text-[13px] font-semibold tracking-[-0.01em] text-text", className)} {...props} />
);

export const CardContent: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("p-4.5", className)} {...props} />
);

export const CardFooter: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("border-t border-border px-4 py-2.5", className)} {...props} />
);
