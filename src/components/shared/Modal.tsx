import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import type { ModalProps } from "../../types/ui";

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, className, footer, size = "default" }) => {
  const { t } = useTranslation();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  const titleId = React.useId();

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      'select:not([disabled]):not([aria-hidden="true"])',
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusableElement =
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusableElement ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-60 flex min-h-dvh w-screen animate-[fade-in_280ms_ease-out] justify-center overflow-y-auto bg-text/28 backdrop-blur-[10px]",
        size === "content" ? "items-center p-4 sm:p-6" : "items-end p-0 sm:items-center sm:p-6")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex flex-col overflow-visible border border-border-strong bg-surface-strong/96 shadow-[0_24px_70px_rgba(75,87,57,0.2),0_2px_8px_rgba(75,87,57,0.09)] backdrop-blur-2xl animate-[modal-in_360ms_cubic-bezier(0.22,0.7,0.24,1)] sm:max-h-[calc(100dvh-3rem)]",
          size === "content" ? "max-h-[calc(100dvh-2rem)] rounded-[1.125rem]"
            : "max-h-[92dvh] w-full rounded-t-[1.25rem] sm:rounded-[1.125rem]",
          className,
        )}
      >
        <div className="flex items-center justify-between rounded-t-[calc(1.25rem-1px)] shrink-0 border-b border-border bg-bg-accent/45 px-5 py-3.5 sm:rounded-t-[calc(1.125rem-1px)]">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.015em] text-text">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("common.closeDialog")}
            icon={<X className="h-5 w-5 text-muted" />}
          ></Button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <div className="shrink-0 rounded-b-[inherit] border-t border-border bg-surface-strong px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
