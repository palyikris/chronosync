import { Check, Clock3, Sparkles } from "lucide-react";
import type { landingContent } from "./content";
import type { ExperienceCopy } from "./experienceContent";
import { demoProject } from "./demoData";

type Props = { copy: (typeof landingContent)["en"]; experience: ExperienceCopy };

export function NotebookIntro({ copy, id }: { copy: Props["copy"]; id?: string }) {
  return <div className="chrono-story-header chrono-notebook-header"><h2 id={id}>{copy.notebookTitle1}<br /><em>{copy.notebookTitle2}</em></h2></div>;
}

export function NotebookSpread({ copy, experience }: Props) {
  return <div className="chrono-notebook">
    <div className="chrono-notebook-cover" />
    <div className="chrono-notebook-page chrono-notebook-page--left"><div className="chrono-crossed"><span className="chrono-empty-check" /><span>{copy.crossed}</span></div>
      {copy.features.slice(0, 2).map(feature => <article className="chrono-feature" key={feature.tag}><span className="chrono-feature-check"><Check size={19} strokeWidth={2} /></span><div><h4>{feature.title}<span className="chrono-feature-ink" aria-hidden="true" /></h4><p>{feature.text}</p></div></article>)}
      <span className="chrono-page-number">01</span>
    </div>
    <div className="chrono-notebook-spine" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
    <div className="chrono-notebook-page chrono-notebook-page--right">
      {copy.features.slice(2).map(feature => <article className="chrono-feature" key={feature.tag}><span className="chrono-feature-check"><Check size={19} strokeWidth={2} /></span><div><h4>{feature.title}<span className="chrono-feature-ink" aria-hidden="true" /></h4><p>{feature.text}</p></div></article>)}
      <div className="chrono-notebook-invoice" aria-hidden="true"><span className="chrono-mono"><Clock3 size={11} />{copy.invoice}</span><span>{demoProject.client}</span><strong>€1,800<span>24 h × €75</span></strong><small><Check size={10} />{copy.invoiceReady}</small></div>
      <div className="chrono-sticky-note"><span className="chrono-note-tape" /><span>{experience.storyNote}</span><svg viewBox="0 0 160 30" aria-hidden="true"><path d="M5 15Q70 1 150 13M16 25Q75 13 135 21" /></svg><Sparkles size={19} /></div><span className="chrono-page-number">02</span>
    </div>
    <span className="chrono-notebook-bookmark" aria-hidden="true" />
    <div className="chrono-notebook-stationery" aria-hidden="true"><i className="chrono-desk-pencil" /><i className="chrono-desk-clip" /></div>
  </div>;
}
