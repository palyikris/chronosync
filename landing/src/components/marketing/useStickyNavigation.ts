import { useEffect } from "react";
import type { RefObject } from "react";

export function useStickyNavigation(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const header = root.current?.querySelector<HTMLElement>(".chrono-nav");
    if (!header) return;
    let frame = 0;
    let previous: boolean | undefined;
    const update = () => {
      frame = 0;
      const scrolled = window.scrollY > 70;
      if (scrolled !== previous) { header.dataset.scrolled = String(scrolled); previous = scrolled; }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", schedule); if (frame) cancelAnimationFrame(frame); };
  }, [root]);
}
