import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import type { ModalProps } from "../../types/ui";

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, className }) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
      <div
        className={cn(
          "flex w-full max-h-[calc(100dvh-2rem)] flex-col overflow-visible rounded-3xl bg-surface-strong shadow-2xl sm:max-h-[calc(100dvh-3rem)]",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border-strong bg-bg-accent px-6 py-5">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("common.closeDialog")}
            icon={<X className="h-5 w-5 text-muted" />}
          ></Button>
        </div>
        {children}
      </div>
    </div>
  );
};