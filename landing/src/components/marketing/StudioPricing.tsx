import { useRef, useState } from "react";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { landingContent } from "./content";
import type { ExperienceCopy } from "./experienceContent";
import type { StudioCopy } from "./studioContent";
import { StudioScene } from "./StudioScene";
import type { StudioMotion } from "./StudioScene";
import { useStudioProgress } from "./useStudioProgress";

type Copy = (typeof landingContent)["en"];
type Plan = Copy["plans"][number];
function SculpturalPlan({ plan, index, copy, experience, paused, language, onSelect }: StudioMotion & { plan: Plan; index: number; copy: Copy; experience: ExperienceCopy; onSelect: (name: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const progress = useStudioProgress(root, paused, "top 90%", "top 15%");
  return <article ref={root} className={`chrono-sculptural-plan ${index === 1 ? "is-featured" : ""}`}>
    <div className="chrono-plan-sculpture"><StudioScene kind={index === 0 ? "essentials" : index === 1 ? "team" : "business"} progress={progress} paused={paused} language={language} /></div>
    <h3>{plan.name}</h3><p className="chrono-sculptural-plan-description">{plan.description}</p>
    <div className="chrono-plan-price"><strong>{copy.price}</strong></div>
    <a className={`chrono-button ${index !== 1 ? "chrono-button--outline" : ""}`} href="#request-access" onClick={() => onSelect(plan.name)}>{experience.request}<ArrowUpRight size={17} /></a>
    <ul>{plan.features.map(feature => <li key={feature}><Check size={15} /><span>{feature}</span></li>)}</ul>
  </article>;
}
export function StudioPricing({ copy, experience, paused, language, onSelect }: StudioMotion & { copy: Copy; experience: ExperienceCopy; onSelect: (name: string) => void }) {
  return <section className="chrono-studio-pricing" id="plans" aria-labelledby="chrono-pricing-title">
    <div className="chrono-pricing-fold" aria-hidden="true" />
    <div className="chrono-pricing-orbits" aria-hidden="true"><i /><i /><i /></div>
    <div className="chrono-studio-pricing-inner"><div className="chrono-studio-pricing-heading"><h2 id="chrono-pricing-title">{copy.pricingTitle1}<br /><em>{copy.pricingTitle2}</em></h2></div>
      <p className="chrono-studio-plan-notice"><span />{copy.pricingNotice}</p>
      <div className="chrono-sculptural-plans">{copy.plans.map((plan, index) => <SculpturalPlan key={plan.name} plan={plan} index={index} copy={copy} experience={experience} paused={paused} language={language} onSelect={onSelect} />)}</div>
    </div>
  </section>;
}
export function ReferenceFolder({ copy, studio, paused, language }: StudioMotion & { copy: Copy; studio: StudioCopy }) {
  const root = useRef<HTMLElement>(null);
  const progress = useStudioProgress(root, paused);
  const [open, setOpen] = useState<number | null>(0);
  return <section ref={root} className="chrono-reference" aria-labelledby="chrono-faq-title">
    <div className="chrono-reference-intro"><h2 id="chrono-faq-title"><em>{studio.faqTitle}</em></h2><div className="chrono-reference-stage"><StudioScene kind="folder" progress={progress} paused={paused} language={language} selection={open ?? -1} /></div></div>
    <div className="chrono-reference-files">{copy.faqs.map((faq, index) => <article className={`chrono-reference-file ${open === index ? "is-open" : ""}`} key={faq.q}>
      <h3><button id={`chrono-question-${index}`} type="button" aria-expanded={open === index} aria-controls={`chrono-answer-${index}`} onClick={() => setOpen(open === index ? null : index)}><span className="chrono-reference-tab chrono-mono">0{index + 1}</span><span>{faq.q}</span><Plus size={18} /></button></h3>
      <div id={`chrono-answer-${index}`} className="chrono-reference-answer" role="region" aria-labelledby={`chrono-question-${index}`} aria-hidden={open !== index} inert={open !== index} onTransitionEnd={event => { if (event.target === event.currentTarget) ScrollTrigger.refresh(); }}><div><p>{faq.a}</p></div></div>
    </article>)}</div>
  </section>;
}
