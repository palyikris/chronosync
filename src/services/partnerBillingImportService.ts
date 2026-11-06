import { supabase } from "../lib/supabaseClient";
import type { PartnerFile, PartnerReviewRow, PartnerBillingField } from "../utils/partnerBillingImport";

export interface PartnerImportOutcome {
  client_id: string;
  status: "updated" | "unchanged" | "failed";
  fields: PartnerBillingField[];
  error_code?: "identity_conflict" | "invalid_data" | "client_not_found" | "request_failed";
}

export { fetchClients as fetchPartnerImportClients } from "./clientProjectService";

export async function readPartnerFile(file: File, encoding: string, signal: AbortSignal): Promise<PartnerFile> {
  if (file.size > 10 * 1024 * 1024) throw new Error("tooLarge");
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error("invalidFile");
  const buffer = await file.arrayBuffer();
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/partnerImport.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => { worker.terminate(); clearTimeout(timeout); signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("invalidFile")); }, 30_000);
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ result?: PartnerFile; error?: string }>) => {
      cleanup();
      if (event.data.result) resolve(event.data.result);
      else reject(new Error(event.data.error ?? "invalidFile"));
    };
    worker.onerror = () => { cleanup(); reject(new Error("invalidFile")); };
    worker.postMessage({ buffer, csv: /\.csv$/i.test(file.name), encoding }, [buffer]);
  });
}

/** The RPC rechecks each field under a row lock; browser snapshots cannot overwrite a concurrent edit. */
export async function importPartnerBilling(
  companyId: string, rows: PartnerReviewRow[], onProgress: (outcomes: PartnerImportOutcome[]) => void,
): Promise<PartnerImportOutcome[]> {
  const outcomes: PartnerImportOutcome[] = [];
  for (let offset = 0; offset < rows.length; offset += 25) {
    const batch = rows.slice(offset, offset + 25);
    try {
      const { data, error } = await supabase.rpc("import_client_billing_details", {
        p_company_id: companyId,
        p_rows: batch.map(row => ({ client_id: row.clientId, data: row.data })),
      });
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== batch.length || data.some((item, index) =>
        item.client_id !== batch[index].clientId || !["updated", "unchanged", "failed"].includes(item.status) || !Array.isArray(item.fields))) {
        throw new Error("Unexpected import response");
      }
      outcomes.push(...data as PartnerImportOutcome[]);
    } catch {
      outcomes.push(...batch.map(row => ({ client_id: row.clientId!, status: "failed" as const,
        fields: [], error_code: "request_failed" as const })));
      // Stop on transport/authorization errors; previously completed batches remain visible and safe to retry.
      outcomes.push(...rows.slice(offset + batch.length).map(row => ({ client_id: row.clientId!, status: "failed" as const,
        fields: [], error_code: "request_failed" as const })));
      onProgress([...outcomes]);
      break;
    }
    onProgress([...outcomes]);
  }
  return outcomes;
}
