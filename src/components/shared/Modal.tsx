import React from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import type { ModalProps } from "../../types/ui";

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, className }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className={cn("w-full max-w-lg overflow-hidden rounded-3xl bg-surface-strong shadow-2xl", className)}>
        <div className="flex items-center justify-between border-b border-border-strong bg-bg-accent px-6 py-5">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="h-5 w-5 text-muted" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};