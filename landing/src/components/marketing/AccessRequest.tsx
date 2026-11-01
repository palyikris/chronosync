import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Check, Mail } from "lucide-react";
import { StudioScene } from "./StudioScene";
import type { StudioMotion } from "./StudioScene";
import { useStudioProgress } from "./useStudioProgress";
import type { ExperienceCopy } from "./experienceContent";

const contactValue = String(import.meta.env.VITE_MARKETING_CONTACT_EMAIL ?? "").trim();
const contactEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactValue) && !/[\r\n]/.test(contactValue) ? contactValue : "";

export function AccessRequest({ copy, language, plan, paused }: StudioMotion & { copy: ExperienceCopy; plan: string | null }) {
  const root = useRef<HTMLElement>(null);
  const progress = useStudioProgress(root, paused, "top 85%", "top 5%");
  const [prepared, setPrepared] = useState<Record<string, string> | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(["name", "email", "company", "team", "goal", "note"].map((key) => [key, String(form.get(key) ?? "").trim()]));
    values.goal = copy.accessOptions[values.goal === "walkthrough" ? 1 : 0];
    setPrepared(values);
    if (contactEmail) {
      const body = `${copy.accessName}: ${values.name}\n${copy.accessEmail}: ${values.email}\n${copy.accessCompany}: ${values.company}\n${copy.accessSize}: ${values.team}\n${copy.accessGoal}: ${values.goal}\n${plan ? `${copy.requestFor}: ${plan}\n` : ""}\n${values.note}`;
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(copy.accessSubject)}&body=${encodeURIComponent(body)}`;
    }
    requestAnimationFrame(() => document.getElementById("chrono-request-result")?.focus());
  };
  const previewText = language === "hu" ? "Kérelem előnézete" : "Preview your request";
  const pendingText = language === "hu" ? "Előnézet elkészült. Az adataid nem kerültek elküldésre vagy mentésre." : "Preview ready. Your details have not been sent or saved.";
  return <section ref={root} className="chrono-access chrono-studio-access" id="request-access" aria-labelledby="chrono-access-title"><div className="chrono-access-intro"><h2 id="chrono-access-title">{copy.accessTitle}<br /><em>{copy.accessTitleEm}</em></h2><p>{copy.accessIntro}</p><div className="chrono-access-assembly"><StudioScene kind="finale" progress={progress} paused={paused} language={language} /></div></div>
    <form className="chrono-access-form" onSubmit={submit} onChange={() => { if (prepared) setPrepared(null); }}>
      {plan ? <span className="chrono-selected-plan"><Check size={13} />{copy.requestFor}: {plan}</span> : null}
      <div className="chrono-form-row"><label>{copy.accessName}<input name="name" autoComplete="name" required maxLength={100} /></label><label>{copy.accessEmail}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
      <div className="chrono-form-row"><label>{copy.accessCompany}<input name="company" autoComplete="organization" required maxLength={160} /></label><label>{copy.accessSize}<select name="team" defaultValue="" required><option value="" disabled>—</option>{copy.accessSizes.map((size) => <option key={size}>{size}</option>)}</select></label></div>
      <label>{copy.accessGoal}<select name="goal" defaultValue="access">{copy.accessOptions.map((goal, index) => <option key={index} value={index === 0 ? "access" : "walkthrough"}>{goal}</option>)}</select></label>
      <label>{copy.accessNote}<span>{copy.optional}</span><textarea name="note" rows={2} maxLength={1500} /></label>
      <label className="chrono-form-consent"><input type="checkbox" required />{copy.accessConsent}</label>
      <button className="chrono-button" type="submit">{contactEmail ? <Mail size={16} /> : <ArrowUpRight size={16} />}{contactEmail ? copy.accessSubmit : previewText}</button>
      <p className="chrono-form-note">{contactEmail ? copy.accessInfo : language === "hu" ? "Csak előnézet. Nem küldünk el adatokat." : "Preview only. Nothing is sent."}</p>
      {prepared ? <div id="chrono-request-result" className="chrono-request-result" role="status" tabIndex={-1}><strong><Check size={17} />{contactEmail ? copy.accessDraft : previewText}</strong><p>{contactEmail ? copy.accessFallback : pendingText}</p>{contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : <dl><div><dt>{copy.accessName}</dt><dd>{prepared.name}</dd></div><div><dt>{copy.accessEmail}</dt><dd>{prepared.email}</dd></div><div><dt>{copy.accessCompany}</dt><dd>{prepared.company}</dd></div><div><dt>{copy.accessSize}</dt><dd>{prepared.team}</dd></div><div><dt>{copy.accessGoal}</dt><dd>{prepared.goal}</dd></div></dl>}</div> : null}
    </form>
  </section>;
}
