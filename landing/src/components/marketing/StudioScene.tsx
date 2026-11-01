import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { StudioKind } from "./studioModels";

const StudioObjects = lazy(() => import("./StudioObjects").then(module => ({ default: module.StudioObjects })));

export type StudioMotion = { paused: boolean; language: "en" | "hu" };

export function StudioScene({ kind, progress, paused, language, selection }: StudioMotion & {
  kind: StudioKind;
  progress: RefObject<number>;
  selection?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    // Keep nearby objects ready and release distant scene geometry.
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "800px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const fallback = <div className={`chrono-studio-fallback chrono-studio-fallback--${kind}`}><span /><i /><b /></div>;
  return <div ref={host} className={`chrono-studio-slot chrono-studio-slot--${kind}`} aria-hidden="true">
    {near ? <Suspense fallback={fallback}><StudioObjects kind={kind} progress={progress} paused={paused} language={language} selection={selection} /></Suspense> : fallback}
  </div>;
}
