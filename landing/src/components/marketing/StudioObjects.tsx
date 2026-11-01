import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createStudioModel } from "./studioModels";
import type { StudioKind } from "./studioModels";
import { registerStudioScene } from "./studioRenderer";

type Props = { kind: StudioKind; progress: RefObject<number>; paused: boolean; language: "en" | "hu"; selection?: number };
export function StudioObjects({ kind, progress, paused, language, selection = 0 }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const live = useRef({ paused, selection });
  useEffect(() => { live.current = { paused, selection }; }, [paused, selection]);
  useEffect(() => {
    const host = mount.current; if (!host) return;
    return registerStudioScene(host, createStudioModel(kind, language), progress, () => live.current);
  }, [kind, language, progress]);
  return <div ref={mount} className="chrono-studio-scene"><div className={`chrono-studio-fallback chrono-studio-fallback--${kind}`}><span /><i /><b /></div></div>;
}
