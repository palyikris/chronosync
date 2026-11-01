import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, RotateCcw } from "lucide-react";
import { DEMO_ROUTES, isDemoRoute, isDemoSnapshot } from "../../demo/protocol";
import type { DemoRoute, DemoSnapshot } from "../../demo/protocol";
import type { ExperienceCopy } from "./experienceContent";
import { appDemoUrl, appOrigin } from "../../siteConfig";

type Props = { copy: ExperienceCopy; language: "en" | "hu" };
const initialSnapshot: DemoSnapshot = { hours: 22, draftHours: 22, submittedHours: 0, approvedHours: 0, entryCount: 3, reviewed: false };

export function GuidedDemo({ copy, language }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ language: string; revision: number; route: DemoRoute; snapshot: DemoSnapshot } | null>(null);
  const current = state?.language === language && state.revision === revision ? state : null;
  const route = current?.route ?? "/timesheet";
  const snapshot = current?.snapshot ?? initialSnapshot;
  const activeStep = DEMO_ROUTES.indexOf(route);
  const loaded = current !== null;
  const hu = language === "hu";
  const step = snapshot.reviewed ? 3 : snapshot.draftHours > 0 || snapshot.entryCount < 4 ? 0 : snapshot.submittedHours > 0 ? 1 : 2;
  const hint = snapshot.reviewed
    ? (hu ? `Elkészült az előnézet: ${snapshot.approvedHours} jóváhagyott óra, ${(snapshot.approvedHours * 75).toLocaleString("hu-HU")} EUR nettó. Ugyanezekkel a vezérlőkkel dolgozol az alkalmazásban is.` : `Preview prepared: ${snapshot.approvedHours} approved hours, €${(snapshot.approvedHours * 75).toLocaleString("en-IE")} net. These are the same controls you’ll use in ChronoSync.`)
    : snapshot.entryCount < 4
      ? (hu ? "Munkaidő → Új bejegyzés. Válaszd az Acme Studio / Brand exploration projektet, adj hozzá 2 órát október 22-re, és mentsd." : "Timesheets → Add entry. Choose Acme Studio / Brand exploration, enter 2 hours for October 22 and a description, then Save entry.")
      : snapshot.draftHours > 0
        ? (hu ? "A bejegyzés tervezetként mentve. A Naptár nézetben válaszd a Hónap lehetőséget a Beküldési időszaknál, majd küldd be a tervezeteket." : "Your entry is saved as a draft. In Calendar View, choose Month under Submission period, then click Submit to send the drafts for review.")
        : snapshot.submittedHours > 0
          ? (hu ? "Válts a Munkaidő ellenőrzése oldalra. Jelöld ki a beküldött bejegyzéseket, és használd a Kijelölt bejegyzések jóváhagyása gombot." : "Open Timesheet Review. Select the submitted entries and use Approve Selected Entries to approve the hours.")
          : (hu ? "Nyisd meg az Ügyfélszámlázást. Ellenőrizd az októberi időszakot és a projekt díját, majd tekintsd át a számlát vagy töltsd le az előnézetet." : "Open Client Invoicing. Check the October period and project rate, then review the invoice or download its preview.");

  useEffect(() => {
    const site = frame.current?.closest<HTMLElement>(".chrono-site");
    const clearInteraction = () => site?.removeAttribute("data-demo-active");
    const receive = (event: MessageEvent) => {
      if (event.origin !== appOrigin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "chronosync-demo-interaction") {
        frame.current?.closest<HTMLElement>(".chrono-site")?.setAttribute("data-demo-active", "true");
      }
      if (event.data.type === "chronosync-demo-state" && isDemoRoute(event.data.route) && isDemoSnapshot(event.data.snapshot)) {
        setState({ language, revision, route: event.data.route, snapshot: event.data.snapshot });
      }
    };
    window.addEventListener("message", receive);
    document.addEventListener("pointerdown", clearInteraction, { passive: true });
    document.addEventListener("focusin", clearInteraction);
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("pointerdown", clearInteraction);
      document.removeEventListener("focusin", clearInteraction);
      clearInteraction();
    };
  }, [language, revision]);

  const navigate = (target: DemoRoute) => frame.current?.contentWindow?.postMessage({ type: "chronosync-demo-navigate", route: target }, appOrigin);

  return <section className="chrono-guided-demo" id="demo" aria-labelledby="guided-demo-title">
    <div className="chrono-section-heading chrono-reveal">
      <p className="chrono-eyebrow">{copy.demoEyebrow}</p>
      <h2 id="guided-demo-title">{copy.demoTitle}<br /><em>{copy.demoTitleEm}</em></h2>
      <p>{hu ? "Próbáld ki a ChronoSync valódi felületét, kitalált adatokkal. Rögzítsd és küldd be az óráidat, hagyd jóvá őket, majd készíts számlaelőnézetet. Fiók nélkül." : "Try ChronoSync’s actual interface with fictional data. Log and submit your hours, approve the entries, then prepare an invoice preview. No account needed."}</p>
    </div>
    <div className="chrono-demo-window chrono-real-demo">
      <div className="chrono-demo-chrome"><span className="chrono-window-dots" aria-hidden="true"><i /><i /><i /></span><span><span className="chrono-live-dot" />{copy.demoSandbox}</span><div className="chrono-demo-window-actions"><a href={appDemoUrl(language)} target="_blank" rel="noopener noreferrer">{hu ? "Teljes nézet" : "Open full demo"}<ArrowUpRight size={13} /></a><button type="button" onClick={() => setRevision(value => value + 1)}><RotateCcw size={13} />{copy.demoReset}</button></div></div>
      <nav className="chrono-real-demo-nav" aria-label={copy.demoStepLabel}>{copy.demoSteps.map((label, index) => <button key={label} type="button" disabled={!loaded} aria-current={activeStep === index ? "step" : undefined} onClick={() => navigate(DEMO_ROUTES[index])}><span>{step > index ? <Check size={13} /> : `0${index + 1}`}</span>{label}</button>)}</nav>
      <div className="chrono-demo-guide" role="status" aria-live="polite"><span className="chrono-guide-count">{step === 3 ? <Check size={14} /> : `${step + 1} / 3`}</span><p>{hint}</p></div>
      <iframe key={`${language}-${revision}`} ref={frame} src={appDemoUrl(language, true)} title={hu ? "ChronoSync interaktív alkalmazásdemó" : "ChronoSync interactive application demo"} loading="lazy" className="chrono-real-demo-frame" />
      <p className="chrono-real-demo-note">{copy.noInvoice} {hu ? "A módosítások az Újrakezdés gombbal törölhetők." : "Use Start again to reset your changes."}</p>
    </div>
  </section>;
}
