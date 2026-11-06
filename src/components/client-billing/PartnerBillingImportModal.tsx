import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, FileSpreadsheet, Loader2, Search, ShieldCheck, Upload, X } from "lucide-react";
import { Modal } from "../shared/Modal";
import { Button } from "../shared/Button";
import { Select } from "../shared/Select";
import { fetchClientBillingProfiles } from "../../services/clientBillingService";
import { fetchPartnerImportClients, importPartnerBilling, readPartnerFile } from "../../services/partnerBillingImportService";
import type { PartnerImportOutcome } from "../../services/partnerBillingImportService";
import { buildPartnerReview, normalizePartnerName, PARTNER_IMPORT_FIELDS, suggestPartnerColumns } from "../../utils/partnerBillingImport";
import type { PartnerColumnMapping, PartnerFile, PartnerImportField, PartnerReviewRow } from "../../utils/partnerBillingImport";
import type { Client } from "../../types/client-project";
import type { ClientBillingProfile } from "../../types/client-billing";
import { cn } from "../../utils/cn";

interface Props { companyId: string; onClose: () => void; onComplete: () => Promise<void> }
type Step = "upload" | "columns" | "review" | "saving" | "done";
const PAGE_SIZE = 15;
const selectClass = "min-h-10 w-full rounded-lg border border-border-strong bg-surface-strong px-3 text-xs text-text focus:outline-2 focus:outline-primary";

export function PartnerBillingImportModal({ companyId, onClose, onComplete }: Props) {
  const { t } = useTranslation();
  const tr = (key: string, options?: Record<string, unknown>) => t(`clientBilling.partnerImport.${key}`, options);
  const [step, setStep] = useState<Step>("upload");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [encoding, setEncoding] = useState("auto");
  const [file, setFile] = useState<PartnerFile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<ClientBillingProfile[]>([]);
  const [mapping, setMapping] = useState<PartnerColumnMapping>({});
  const [choices, setChoices] = useState<Record<number, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<PartnerImportOutcome[]>([]);
  const [importTotal, setImportTotal] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (step !== "saving") return;
    const preventUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [step]);

  const rows = useMemo(() => file ? buildPartnerReview(file, mapping, clients, profiles, companyId, choices) : [],
    [file, mapping, clients, profiles, companyId, choices]);
  const clientById = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);
  const profileById = useMemo(() => new Map(profiles.map(profile => [profile.client_id, profile])), [profiles]);
  const ready = rows.filter(row => row.status === "ready");
  const needsMatch = rows.filter(row => row.status === "unmatched" || row.status === "blocked");
  const filtered = rows.filter(row => (filter === "all" || (filter === "ready" ? row.status === "ready" :
    filter === "attention" ? ["unmatched", "blocked"].includes(row.status) : ["unchanged", "skipped"].includes(row.status))) &&
    normalizePartnerName(`${row.name} ${clientById.get(row.clientId ?? "")?.name ?? ""}`)
      .includes(normalizePartnerName(search)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const visibleRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const updated = outcomes.filter(outcome => outcome.status === "updated").length;
  const failed = outcomes.filter(outcome => outcome.status === "failed");
  const progress = importTotal ? Math.round(outcomes.length / importTotal * 100) : 0;
  const formatValue = (field: string, value: unknown) => {
    const labels: Record<string, string> = { "1": "Domestic", "6": "Eu", "7": "NonEu", "0": "Unknown", "-1": "NoNumber" };
    return field === "tax_subject" ? t(`clientBilling.taxSubject${labels[String(value)]}`) : String(value ?? "");
  };
  const close = () => {
    if (busy.current) return;
    controller.current?.abort();
    onClose();
  };

  const load = async (selected: File) => {
    if (reading || busy.current) return;
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    setReading(true); setError(null); setFileName(selected.name);
    try {
      const [parsed, freshClients, freshProfiles] = await Promise.all([
        readPartnerFile(selected, encoding, abort.signal), fetchPartnerImportClients(companyId), fetchClientBillingProfiles(companyId),
      ]);
      if (abort.signal.aborted) return;
      setFile(parsed); setMapping(suggestPartnerColumns(parsed.headers));
      setClients(freshClients); setProfiles(freshProfiles); setChoices({});
      setStep("columns");
    } catch (err) {
      if (abort.signal.aborted) return;
      const known = ["empty", "invalidFile", "tooLarge", "tooManyRows", "encoding"];
      setError(tr(`errors.${err instanceof Error && known.includes(err.message) ? err.message : "loadFailed"}`));
    } finally {
      if (!abort.signal.aborted) setReading(false);
    }
  };

  const startImport = async (selectedRows: PartnerReviewRow[] = ready) => {
    if (busy.current || !selectedRows.length) return;
    busy.current = true;
    setStep("saving"); setError(null); setOutcomes([]); setImportTotal(selectedRows.length);
    try {
      const result = await importPartnerBilling(companyId, selectedRows, setOutcomes);
      setOutcomes(result);
      try {
        const freshProfiles = await fetchClientBillingProfiles(companyId);
        setProfiles(freshProfiles);
        await onComplete();
      } catch { setError(tr("errors.refreshFailed")); }
      setStep("done");
    } finally { busy.current = false; }
  };

  const changeMapping = (field: PartnerImportField, value: string) => {
    setMapping(current => {
      const next = { ...current };
      delete next[field];
      if (value !== "") {
        for (const key of PARTNER_IMPORT_FIELDS) if (next[key] === Number(value)) delete next[key];
        next[field] = Number(value);
      }
      return next;
    });
    setChoices({});
  };

  const stepIndex = step === "upload" ? 0 : step === "columns" ? 1 : 2;
  const footer = <div className="flex flex-wrap items-center justify-between gap-3">
    <Button variant="ghost" onClick={step === "columns" ? () => { setStep("upload"); setError(null); } :
      step === "review" ? () => setStep("columns") : close} disabled={step === "saving"}>
      {step === "columns" || step === "review" ? <><ArrowLeft />{tr("back")}</> : t("common.close")}
    </Button>
    {step === "columns" ? <Button onClick={() => { setStep("review"); setPage(0); setSearch(""); setFilter("all"); }}
      disabled={Object.keys(mapping).filter(field => field !== "client_code").length === 0}>
      {tr("reviewMatches")}<ArrowRight />
    </Button> : step === "review" ? <Button onClick={() => void startImport()} disabled={!ready.length}>
      <Upload />{tr("importButton", { count: ready.length })}
    </Button> : step === "done" ? <div className="flex flex-wrap gap-2">
      {failed.length ? <Button variant="secondary" onClick={() => {
        const ids = new Set(failed.map(outcome => outcome.client_id));
        setFilter("all"); setSearch(""); setPage(0);
        setChoices(current => Object.fromEntries(rows.map(row => [row.rowNumber,
          row.clientId && ids.has(row.clientId) ? current[row.rowNumber] ?? row.clientId : null])));
        setStep("review");
      }}>{tr("reviewFailed")}</Button> : null}
      <Button onClick={close}><Check />{tr("doneButton")}</Button>
    </div> : null}
  </div>;

  return <Modal open title={tr("title")} onClose={close} closeDisabled={step === "saving"} className="max-w-4xl" footer={footer}>
    <div className="space-y-5 p-4 sm:p-6">
      {step !== "saving" && step !== "done" ? <>
        <ol className="flex gap-2" aria-label={tr("stepsLabel")}>
          {["upload", "columns", "review"].map((name, index) => <li key={name}
            aria-current={stepIndex === index ? "step" : undefined}
            className={cn("flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-[11px] sm:px-3 sm:text-xs",
              stepIndex === index ? "bg-primary/10 font-semibold text-primary-strong" : "text-muted")}>
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
              stepIndex >= index ? "bg-primary text-primary-foreground" : "bg-bg-accent")}>
              {stepIndex > index ? <Check className="h-3 w-3" /> : index + 1}</span>{tr(`steps.${name}`)}
          </li>)}
        </ol>
        <div className="flex items-start gap-2.5 rounded-xl border border-success/15 bg-success-bg/60 px-4 py-3 text-xs leading-relaxed text-muted-strong">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /><p>{tr("preserveHint")}</p>
        </div>
      </> : null}

      {error ? <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-xs text-danger">{error}</div> : null}

      {step === "upload" ? <div className="space-y-4">
        <div><h3 className="text-lg font-semibold text-text">{tr("uploadTitle")}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{tr("exportPath")}</p></div>
        <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx" className="sr-only" id="partner-file"
          disabled={reading} onChange={event => { const selected = event.target.files?.[0]; if (selected) void load(selected); event.target.value = ""; }} />
        <button type="button" disabled={reading} onClick={() => fileInput.current?.click()}
          onDragOver={event => { event.preventDefault(); if (!reading) setDragging(true); }}
          onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false);
            const selected = event.dataTransfer.files[0]; if (selected && !reading) void load(selected); }}
          className={cn("flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-8 transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            dragging ? "border-primary bg-primary/10" : "border-border-strong bg-bg-accent/25 hover:border-primary/60 hover:bg-primary/5")}>
          <span className="rounded-2xl border border-border bg-surface-strong p-3 shadow-sm">
            {reading ? <Loader2 className="h-7 w-7 animate-spin text-primary-strong" /> : <FileSpreadsheet className="h-7 w-7 text-primary-strong" />}</span>
          <span className="text-sm font-semibold text-text">{reading ? tr("reading") : tr("chooseFile")}</span>
          <span className="max-w-full break-all text-xs text-muted">{reading ? fileName : tr("fileHint")}</span>
        </button>
        <div className="max-w-xs"><Select label={tr("encoding")} value={encoding} disabled={reading} onChange={event => setEncoding(event.target.value)}>
          <option value="auto">{tr("encodingAuto")}</option><option value="utf-8">UTF-8</option>
          <option value="windows-1250">Windows-1250</option><option value="iso-8859-2">ISO-8859-2</option>
        </Select></div>
        <p className="text-[11px] leading-relaxed text-muted">{tr("localFileHint")}</p>
      </div> : null}

      {step === "columns" && file ? <div className="space-y-4">
        <div className="flex items-start gap-3"><FileSpreadsheet className="mt-1 h-5 w-5 shrink-0 text-primary-strong" />
          <div className="min-w-0"><h3 className="break-all text-sm font-semibold text-text">{fileName}</h3>
            <p className="mt-1 text-xs text-muted">{tr("fileSummary", { count: file.rows.length, sheet: file.sheetName })}</p></div></div>
        <p className="text-xs leading-relaxed text-muted-strong">{tr("columnsHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTNER_IMPORT_FIELDS.map(field => <div key={field} className="rounded-xl border border-border bg-bg-accent/20 p-3">
            <label htmlFor={`partner-column-${field}`} className="mb-1.5 block text-xs font-medium text-text">{tr(`fields.${field}`)}</label>
            <select id={`partner-column-${field}`} className={selectClass} value={mapping[field] ?? ""} onChange={event => changeMapping(field, event.target.value)}>
              <option value="">{tr("ignoreColumn")}</option>
              {file.headers.map((header, index) => <option key={index} value={index}>{header || tr("unnamedColumn", { number: index + 1 })}</option>)}
            </select>
            {mapping[field] !== undefined ? <p className="mt-1.5 truncate text-[10px] text-muted" title={file.rows[0]?.values[mapping[field]!] ?? ""}>
              {tr("example", { value: file.rows[0]?.values[mapping[field]!] || "—" })}</p> : null}
          </div>)}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{tr("codeHint")}</p>
      </div> : null}

      {step === "review" ? <div className="space-y-4">
        <div><h3 className="text-lg font-semibold text-text">{tr("reviewTitle")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{tr("matchHint")}</p></div>
        <div className="grid grid-cols-3 gap-2">
          {[{ count: ready.length, label: "ready", className: "text-success" }, { count: needsMatch.length, label: "attention", className: "text-warning" },
            { count: rows.length - ready.length - needsMatch.length, label: "skipped", className: "text-muted-strong" }].map(item =>
            <div key={item.label} className="rounded-xl border border-border bg-bg-accent/25 px-2 py-3 text-center">
              <p className={cn("text-xl font-semibold", item.className)}>{item.count}</p><p className="mt-1 text-[10px] text-muted sm:text-xs">{tr(item.label)}</p>
            </div>)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted" />
            <input aria-label={tr("search")} placeholder={tr("search")} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}
              className={cn(selectClass, "pl-8")} /></label>
          <select aria-label={tr("filter")} className={cn(selectClass, "sm:w-44")} value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>
            {["all", "ready", "attention", "skipped"].map(value => <option key={value} value={value}>{tr(value)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {visibleRows.map(row => {
            const client = clientById.get(row.clientId ?? "");
            const isExpanded = expanded === row.rowNumber;
            const profile = row.clientId ? profileById.get(row.clientId) : undefined;
            return <article key={row.rowNumber} className="overflow-hidden rounded-xl border border-border bg-surface-strong">
              <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : row.rowNumber)}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-bg-accent/40">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px]",
                  row.status === "ready" ? "bg-success-bg text-success" : row.status === "blocked" || row.status === "unmatched" ? "bg-warning-bg text-warning" : "bg-bg-accent text-muted")}>
                  {row.status === "ready" ? <Check className="h-4 w-4" /> : row.rowNumber}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text">{row.name || tr("row", { number: row.rowNumber })}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted">{client ? `${client.name} · ${client.client_code}` : tr("noMatch")}</span></span>
                <span className="shrink-0 text-[10px] text-muted-strong">{tr(`status.${row.status}`, { count: row.changes.length })}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", isExpanded && "rotate-180")} />
              </button>
              {isExpanded ? <div className="space-y-3 border-t border-border bg-bg-accent/15 p-3">
                <Select label={tr("matchClient")} value={row.clientId ?? ""} onChange={event => setChoices(current => ({ ...current, [row.rowNumber]: event.target.value || null }))}>
                  <option value="">{tr("skipRow")}</option>
                  {clients.map(item => <option key={item.id} value={item.id}>{item.name} · {item.client_code}</option>)}
                </Select>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
                  <span>{tr(`match.${row.match}`)}</span><button type="button" className="inline-flex min-h-8 items-center gap-1 text-muted-strong hover:underline"
                    onClick={() => setChoices(current => ({ ...current, [row.rowNumber]: null }))}><X className="h-3 w-3" />{tr("skipRow")}</button>
                </div>
                {row.issues.map((issue, index) => <p key={`${issue}-${index}`} className="rounded-lg bg-warning-bg p-2.5 text-[11px] leading-relaxed text-warning">
                  {tr(`issues.${issue}`)}{issue === "invalid" ? ` ${row.invalidFields.map(field => tr(`fields.${field}`)).join(", ")}` : ""}</p>)}
                <div className="divide-y divide-border rounded-lg border border-border bg-surface-strong">
                  {Object.entries(row.data).map(([field, value]) => <div key={field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 p-2.5 text-[11px]">
                    <span className="text-muted">{tr(`fields.${field}`)}</span><div className="min-w-0 break-words text-text">
                      {row.preserved.includes(field as typeof row.preserved[number]) ? <><span className="font-medium">{formatValue(field, profile?.[field as keyof ClientBillingProfile])}</span>
                        <span className="ml-1.5 rounded bg-bg-accent px-1.5 py-0.5 text-[9px] text-muted">{tr("kept")}</span>
                        {String(value) !== String(profile?.[field as keyof ClientBillingProfile]) ? <span className="mt-1 block text-[10px] text-muted">{tr("fileValue", { value: formatValue(field, value) })}</span> : null}</>
                        : <><span>{formatValue(field, value)}</span>{row.clientId ? <span className="ml-1.5 text-[9px] font-medium text-success">{tr("fillsEmpty")}</span> : null}</>}
                    </div></div>)}
                </div>
              </div> : null}
            </article>;
          })}
          {!filtered.length ? <p className="py-8 text-center text-xs text-muted">{tr("noRows")}</p> : null}
        </div>
        {filtered.length > PAGE_SIZE ? <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <Button variant="ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft />{tr("previous")}</Button>
          <span>{tr("page", { current: currentPage + 1, total: Math.ceil(filtered.length / PAGE_SIZE) })}</span>
          <Button variant="ghost" disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(currentPage + 1)}>{tr("next")}<ArrowRight /></Button>
        </div> : null}
        <p className="text-[11px] leading-relaxed text-muted">{tr("skipHint")}</p>
      </div> : null}

      {step === "saving" ? <div className="space-y-6 py-10 text-center" role="status" aria-live="polite">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Loader2 className="h-8 w-8 animate-spin text-primary-strong" /></span>
        <div><h3 className="text-lg font-semibold text-text">{tr("savingTitle")}</h3>
          <p className="mt-2 text-xs text-muted">{tr("savingProgress", { completed: outcomes.length, total: importTotal })}</p></div>
        <div className="mx-auto max-w-sm"><progress aria-label={tr("savingTitle")} value={progress} max={100} className="h-2 w-full accent-primary" />
          <p className="mt-2 text-[11px] text-muted">{tr("savingHint")}</p></div>
      </div> : null}

      {step === "done" ? <div className="space-y-5 py-4">
        <div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg"><CheckCircle2 className="h-7 w-7 text-success" /></span>
          <h3 className="mt-4 text-xl font-semibold text-text">{tr(failed.length ? "doneWithIssues" : "doneTitle")}</h3>
          <p className="mt-2 text-xs text-muted">{tr("doneDescription", { count: updated })}</p></div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[{ number: updated, label: "updated" }, { number: outcomes.filter(outcome => outcome.status === "unchanged").length, label: "unchanged" },
            { number: failed.length, label: "failed" }].map(item => <div key={item.label} className="rounded-xl border border-border bg-bg-accent/25 p-3">
              <p className="text-xl font-semibold text-text">{item.number}</p><p className="mt-1 text-[10px] text-muted">{tr(item.label)}</p></div>)}
        </div>
        {failed.length ? <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-warning/20 bg-warning-bg/40 p-3">
          {failed.map(outcome => <p key={outcome.client_id} className="text-xs text-warning"><span className="font-semibold">{clientById.get(outcome.client_id)?.name}</span>
            {" · "}{tr(`errors.${outcome.error_code ?? "request_failed"}`)}</p>)}
        </div> : null}
        <p className="text-center text-[11px] leading-relaxed text-muted">{tr("donePreserved")}</p>
      </div> : null}
    </div>
  </Modal>;
}
