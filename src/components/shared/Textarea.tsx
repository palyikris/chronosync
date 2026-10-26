import React from "react";
import { cn } from "../../utils/cn";
import type { TextareaProps } from "../../types/ui";

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-[10px] border border-border-strong bg-white/55 px-3 py-2.5 text-[13px] text-text outline-none transition-[background-color,border-color,box-shadow] duration-300 ease-out placeholder:text-muted hover:border-primary-strong/30 focus:border-primary-strong/45 focus:bg-white/85 focus:ring-3 focus:ring-primary/12",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
