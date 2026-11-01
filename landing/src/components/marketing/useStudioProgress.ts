import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Scroll state stays outside React's render loop and is shared with WebGL. */
export function useStudioProgress(
  element: RefObject<HTMLElement | null>,
  paused: boolean,
  start = "top 85%",
  end = "bottom 40%",
) {
  const progress = useRef(1);
  useLayoutEffect(() => {
    if (!element.current || paused) { progress.current = 1; return; }
    const context = gsap.context(() => {
      gsap.fromTo(progress, { current: 0 }, {
        current: 1, ease: "none",
        scrollTrigger: { trigger: element.current, start, end, scrub: 0.15, invalidateOnRefresh: true },
      });
    }, element);
    return () => context.revert();
  }, [element, paused, start, end]);
  return progress;
}
