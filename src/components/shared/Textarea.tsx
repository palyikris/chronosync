import React from "react";
import { cn } from "../../utils/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-xl border border-border-strong bg-transparent px-3 py-3 text-sm text-text outline-none transition focus:ring-2 focus:ring-primary-strong",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";