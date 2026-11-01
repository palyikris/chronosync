import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const ThreeScene = lazy(() => import("./ThreeScene").then((module) => ({ default: module.ThreeScene })));

export function DeferredScene({ kind, progress, paused, staticFallback, image = "/marketing/app-timesheets.png" }: { kind: "clock" | "laptop"; progress: RefObject<number>; paused: boolean; staticFallback: boolean; image?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(kind === "clock");
  useEffect(() => {
    if (near || !host.current || staticFallback) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "900px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [near, staticFallback]);
  const fallback = kind === "clock" ? <div className="chrono-clock-fallback"><span /><i /><b /></div> : <div className="chrono-laptop-fallback"><img src={image} alt="" width={1440} height={826} loading="lazy" /></div>;
  return <div ref={host} className="chrono-scene-mount">{near && !staticFallback ? <Suspense fallback={fallback}><ThreeScene kind={kind} progress={progress} paused={paused} image={image} /></Suspense> : fallback}</div>;
}
