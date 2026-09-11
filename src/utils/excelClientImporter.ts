import * as XLSX from "xlsx";
import i18n from "../lib/i18n";
import {
  bulkFetchCompanyClients,
  bulkInsertClients,
  type BulkClientInsertItem,
} from "../services/clientProjectService";
import type { InvoiceAttachmentLanguage } from "../types/client-project";

export interface ClientImportRowOutcome {
  rowNumber: number;
  clientCode: string;
  clientName: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
}

export interface ClientBulkImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  outcomes: ClientImportRowOutcome[];
}

const normalize = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim().toLowerCase();

const parseNonNegativeNumber = (value: unknown): number | null => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return 0;
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

const parseLanguage = (
  value: unknown,
): InvoiceAttachmentLanguage | null => {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return "en";
  return normalizedValue === "en" || normalizedValue === "hu"
    ? normalizedValue
    : null;
};

const parseBoolean = (value: unknown): boolean | null => {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;
  if (["true", "1", "yes"].includes(normalizedValue)) return true;
  if (["false", "0", "no"].includes(normalizedValue)) return false;
  return null;
};

export const parseAndImportClientsExcel = async (
  file: File,
  companyId: string,
): Promise<ClientBulkImportResult> => {
  const t = i18n.t.bind(i18n);
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    throw new Error(t("companySettings.clientImportNoSheets"));
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Array<
    Record<string, unknown>
  >;

  if (rawRows.length === 0) {
    throw new Error(t("companySettings.clientImportEmptySheet"));
  }

  const firstRowKeys = Object.keys(rawRows[0]);
  if (
    !firstRowKeys.includes("Client Name") ||
    !firstRowKeys.includes("Client Code")
  ) {
    throw new Error(t("companySettings.clientImportInvalidFormat"));
  }

  const existingClients = await bulkFetchCompanyClients(companyId);
  const existingCodes = new Set(
    existingClients.map((client) => normalize(client.client_code)),
  );
  const outcomes: ClientImportRowOutcome[] = [];
  const toInsert: BulkClientInsertItem[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const clientName = String(row["Client Name"] ?? "").trim();
    const clientCode = String(row["Client Code"] ?? "").trim();

    if (!clientName || !clientCode) return;

    const language = parseLanguage(row["Invoice Attachment Language"]);
    const availableHours = parseNonNegativeNumber(
      row["Available Hours Per Month"],
    );
    const previousMonthHours = parseNonNegativeNumber(
      row["Hours From Previous Month"],
    );
    const isDefault = parseBoolean(row["Default"]);

    if (
      language === null ||
      availableHours === null ||
      previousMonthHours === null ||
      isDefault === null
    ) {
      outcomes.push({
        rowNumber,
        clientCode,
        clientName,
        status: "failed",
        reason: t("companySettings.clientImportInvalidOptionalValue"),
      });
      return;
    }

    const normalizedCode = normalize(clientCode);
    if (existingCodes.has(normalizedCode)) {
      outcomes.push({
        rowNumber,
        clientCode,
        clientName,
        status: "skipped",
        reason: t("companySettings.clientImportDuplicateClientCode"),
      });
      return;
    }

    existingCodes.add(normalizedCode);
    toInsert.push({
      company_id: companyId,
      name: clientName,
      client_code: clientCode,
      invoice_attachment_language: language,
      available_hours_per_month: availableHours,
      hours_from_previous_month: previousMonthHours,
      is_default: isDefault,
    });
    outcomes.push({ rowNumber, clientCode, clientName, status: "created" });
  });

  if (toInsert.length > 0) await bulkInsertClients(toInsert);

  return {
    totalRows: outcomes.length,
    createdCount: outcomes.filter((item) => item.status === "created").length,
    skippedCount: outcomes.filter((item) => item.status === "skipped").length,
    failedCount: outcomes.filter((item) => item.status === "failed").length,
    outcomes,
  };
};