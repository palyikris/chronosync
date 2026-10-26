import { useEffect, useRef, type RefObject } from "react";

export function usePopoverDismiss(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLButtonElement | null>,
  onClose: () => void,
) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const belongsToPopover = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      let element: Element | null = target;
      const visited = new Set<Element>();
      while (element && !visited.has(element)) {
        if (root.current?.contains(element)) return true;
        visited.add(element);
        const owner: string | undefined = element.closest<HTMLElement>("[data-popover-owner]")?.dataset.popoverOwner;
        element = owner ? document.getElementById(owner) : null;
      }
      return false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!belongsToPopover(event.target)) close.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close.current();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, root, trigger]);
}
