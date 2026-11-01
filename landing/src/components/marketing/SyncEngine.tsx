import { useLayoutEffect, useRef } from "react";
import { ArrowRight, Check, Clock3, FolderCheck } from "lucide-react";
import { gsap } from "gsap";
import { StudioScene } from "./StudioScene";
import type { StudioMotion } from "./StudioScene";
import type { StudioCopy } from "./studioContent";

export function SyncEngine({ copy, paused, language }: StudioMotion & { copy: StudioCopy }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(1);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (paused) { progress.current = 1; element.dataset.phase = "2"; return; }
    const context = gsap.context(() => {
      gsap.fromTo(progress, { current: 0 }, { current: 1, ease: "none", onUpdate: () => {
        element.dataset.phase = String(progress.current < 0.33 ? 0 : progress.current < 0.68 ? 1 : 2);
        element.style.setProperty("--sync-progress", String(progress.current));
      }, scrollTrigger: { trigger: element, start: "top top", end: "bottom bottom", scrub: 0.15, invalidateOnRefresh: true } });
      gsap.from(".chrono-engine-heading h2 > span", { yPercent: 15, opacity: 0.5, stagger: 0.04, ease: "none", scrollTrigger: { trigger: element, start: "top 88%", end: "top 50%", scrub: 0.15 } });
    }, element);
    return () => { context.revert(); element.style.removeProperty("--sync-progress"); };
  }, [paused, language]);
  return <section ref={root} className="chrono-engine" aria-labelledby="chrono-engine-title" data-phase="0">
    <div className="chrono-engine-sticky">
      <div className="chrono-engine-heading"><div><h2 id="chrono-engine-title"><span>{copy.engineTitle}</span><span><em>{copy.engineTitleEm}</em></span></h2></div></div>
      <div className="chrono-engine-stage"><div className="chrono-engine-grid" /><StudioScene kind="engine" progress={progress} paused={paused} language={language} /></div>
      <div className="chrono-engine-steps">{copy.engineStages.map((stage, index) => <div className="chrono-engine-step" key={stage}><span className="chrono-engine-step-icon">{index === 0 ? <Clock3 size={20} /> : index === 1 ? <Check size={20} /> : <FolderCheck size={20} />}</span><h3>{stage}</h3>{index !== 2 && <ArrowRight className="chrono-engine-step-arrow" size={20} />}</div>)}</div>
    </div>
  </section>;
}
