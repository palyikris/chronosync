import { useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, FileSpreadsheet, FileText, FolderCheck, ShieldCheck, Users } from "lucide-react";
import type { ExperienceCopy } from "./experienceContent";
import type { StudioCopy } from "./studioContent";
import { getDemoCsv } from "./demoData";
import { StudioScene } from "./StudioScene";
import type { StudioMotion } from "./StudioScene";
import { useStudioProgress } from "./useStudioProgress";

export function WorkflowProof({ copy, studio, paused, language }: StudioMotion & { copy: ExperienceCopy; studio: StudioCopy }) {
  const root = useRef<HTMLElement>(null);
  const progress = useStudioProgress(root, paused, "top 85%", "center 30%");
  const [document, setDocument] = useState(0);
  const csv = `data:text/csv;charset=utf-8,${encodeURIComponent(getDemoCsv())}`;
  return <section ref={root} className="chrono-workbench" id="outputs" aria-labelledby="chrono-proof-title">
    <div className="chrono-workbench-heading"><h2 id="chrono-proof-title">{studio.proofTitle}<br /><em>{studio.proofTitleEm}</em></h2></div>
    <div className="chrono-workbench-grid">
      <div className="chrono-document-workspace">
        <div className="chrono-document-stage"><StudioScene kind="documents" progress={progress} paused={paused} language={language} selection={document} /><span className="chrono-document-seal"><Check size={14} />{copy.approvedStatus}</span></div>
        <div className="chrono-document-tabs" role="group" aria-label={studio.documentHint}>{studio.documents.map((name, index) => <button key={name} type="button" aria-pressed={document === index} aria-controls="chrono-document-description" onClick={() => setDocument(index)}>{index === 2 ? <FileSpreadsheet size={15} /> : <FileText size={15} />}<span>{name}</span></button>)}</div>
        <div id="chrono-document-description" className="chrono-document-description" aria-live="polite"><p>{studio.documentDetails[document]}</p></div>
        <div className="chrono-proof-downloads"><a href="/marketing/chronosync-sample-project.pdf" download><ArrowDownToLine size={15} />{copy.download}<ArrowUpRight size={14} /></a><a href={csv} download="chronosync-sample-project.csv"><ArrowDownToLine size={15} />{copy.downloadCsv}<ArrowUpRight size={14} /></a></div>
        <p className="chrono-proof-disclaimer">{copy.proofNote}</p>
      </div>
      <div className="chrono-workbench-roles"><h3>{copy.rolesTitle}</h3><div className="chrono-role-trail">{copy.roles.map((role, index) => <article key={role.title} className="chrono-role-stop"><span className="chrono-role-icon">{index === 0 ? <Users size={20} /> : index === 1 ? <ShieldCheck size={20} /> : <FolderCheck size={20} />}</span><div><h4>{role.title}</h4><p>{role.text}</p></div></article>)}</div></div>
    </div>
  </section>;
}
