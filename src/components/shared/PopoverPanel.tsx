import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export function PopoverPanel({ trigger, id, title, width, children }: {
  trigger: RefObject<HTMLButtonElement | null>; id: string; title: string; width: number; children: ReactNode;
}) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(width, window.innerWidth - 24);
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 120));
      const left = Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12));
      const maxHeight = window.innerHeight - top - 12;
      setPosition(current => current?.top === top && current.left === left && current.width === panelWidth && current.maxHeight === maxHeight
        ? current : { position: "fixed", top, left, width: panelWidth, maxHeight });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [trigger, width]);
  return createPortal(<div id={id} role="dialog" aria-label={title} data-popover-owner={`${id}-trigger`}
    style={position ?? { visibility: "hidden" }}
    className="z-50 overflow-y-auto overscroll-contain rounded-2xl border border-border-strong bg-white p-4 shadow-xl">
    {children}
  </div>, document.body);
}
