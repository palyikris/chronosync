import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import type { ModalProps } from "../../types/ui";

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, className }) => {
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex animate-[fade-in_160ms_ease-out] items-end justify-center overflow-y-auto bg-text/28 p-0 backdrop-blur-[10px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-visible rounded-t-[1.25rem] border border-border-strong bg-surface-strong/96 shadow-[0_24px_70px_rgba(75,87,57,0.2),0_2px_8px_rgba(75,87,57,0.09)] backdrop-blur-2xl animate-[modal-in_220ms_cubic-bezier(0.22,1,0.36,1)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.125rem]",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border bg-bg-accent/45 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-text">{title}</h2>
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
