import React from "react";
import { cn } from "../../utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border-strong bg-surface-strong shadow-card",
        className,
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("border-b border-border-strong bg-bg-accent px-4 py-4", className)} {...props} />
);

export const CardTitle: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("text-sm font-bold text-text", className)} {...props} />
);

export const CardContent: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("p-4", className)} {...props} />
);

export const CardFooter: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={cn("border-t border-border-strong px-4 py-4", className)} {...props} />
);