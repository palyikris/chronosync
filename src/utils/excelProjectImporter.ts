import * as XLSX from "xlsx";
import i18n from "../lib/i18n";
import {
  bulkFetchCompanyClientsAndProjects,
  bulkInsertProjects,
  type BulkProjectInsertItem,
} from "../services/clientProjectService";

export interface ImportRowOutcome {
  rowNumber: number;
  clientCode: string;
  projectName: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
}

export interface BulkImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  outcomes: ImportRowOutcome[];
}

const normalize = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  return String(val).trim().toLowerCase();
};

const parseEstimatedHours = (value: unknown): number | null => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

export const parseAndImportProjectsExcel = async (
  file: File,
  companyId: string,
): Promise<BulkImportResult> => {
  const t = i18n.t.bind(i18n);
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    throw new Error(t("companySettings.projectImportNoSheets"));
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  }) as Array<Record<string, unknown>>;

  if (rawRows.length === 0) {
    throw new Error(t("companySettings.projectImportEmptySheet"));
  }

  // Exact header validation
  const firstRowKeys = Object.keys(rawRows[0]);
  const hasClientCode = firstRowKeys.includes("Client Code");
  const hasProjectName = firstRowKeys.includes("Project Name");
  const hasEstimatedHours = firstRowKeys.includes("Estimated Hours Per Month");

  if (!hasClientCode || !hasProjectName || !hasEstimatedHours) {
    throw new Error(
      t("companySettings.projectImportInvalidFormat"),
    );
  }

  const { clients, projects } =
    await bulkFetchCompanyClientsAndProjects(companyId);

  // Lookup map: normalized client_code -> client_id
  const clientMap = new Map<string, string>();
  clients.forEach((c) => {
    if (c.client_code) {
      clientMap.set(normalize(c.client_code), c.id);
    }
  });

  // Track duplicates: Set of `${clientId}:${normalizedProjectName}`
  const existingSet = new Set<string>();
  projects.forEach((p) => {
    existingSet.add(`${p.client_id}:${normalize(p.name)}`);
  });

  const outcomes: ImportRowOutcome[] = [];
  const toInsert: BulkProjectInsertItem[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index and header
    const rawClientCode = row["Client Code"];
    const rawProjectName = row["Project Name"];
    const rawEstimatedHours = row["Estimated Hours Per Month"];

    const clientCodeStr = String(rawClientCode ?? "").trim();
    const projectNameStr = String(rawProjectName ?? "").trim();
    const estimatedHours = parseEstimatedHours(rawEstimatedHours);

    // Ignore rows where any required import field is blank
    if (!clientCodeStr || !projectNameStr || estimatedHours === null) {
      return;
    }

    const normCode = normalize(clientCodeStr);
    const normProj = normalize(projectNameStr);
    const clientId = clientMap.get(normCode);

    if (!clientId) {
      outcomes.push({
        rowNumber,
        clientCode: clientCodeStr,
        projectName: projectNameStr,
        status: "failed",
        reason: t("companySettings.projectImportClientCodeMissing", {
          clientCode: clientCodeStr,
        }),
      });
      return;
    }

    const key = `${clientId}:${normProj}`;

    if (existingSet.has(key)) {
      outcomes.push({
        rowNumber,
        clientCode: clientCodeStr,
        projectName: projectNameStr,
        status: "skipped",
        reason: t("companySettings.projectImportDuplicateProject"),
      });
      return;
    }

    // Mark as seen immediately to catch file-internal duplicates
    existingSet.add(key);

    toInsert.push({
      company_id: companyId,
      client_id: clientId,
      name: projectNameStr, // Preserves raw casing entered by user
      estimated_hours_per_month: estimatedHours,
    });

    outcomes.push({
      rowNumber,
      clientCode: clientCodeStr,
      projectName: projectNameStr,
      status: "created",
    });
  });

  if (toInsert.length > 0) {
    await bulkInsertProjects(toInsert);
  }

  const createdCount = outcomes.filter((o) => o.status === "created").length;
  const skippedCount = outcomes.filter((o) => o.status === "skipped").length;
  const failedCount = outcomes.filter((o) => o.status === "failed").length;

  return {
    totalRows: outcomes.length,
    createdCount,
    skippedCount,
    failedCount,
    outcomes,
  };
};
