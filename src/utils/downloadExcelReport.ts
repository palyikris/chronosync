import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";

interface DownloadReportParams {
  companyId: string;
  clientIds: string[];
  periodText?: string;
  startDate: string;
  endDate: string;
  language: string;
  updateRemainingHours?: boolean;
}

interface ReportDownload {
  blob: Blob;
  filename: string | null;
}

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const getErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const detail = "detail" in payload ? payload.detail : null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String(item.msg)
          : null,
      )
      .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join(" ") : null;
  }
  return null;
};

export const getReportFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;

  const encodedMatch = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );
  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  let rawFilename = quotedMatch?.[1] ?? plainMatch?.[1]?.trim();
  if (encodedMatch?.[1]) {
    try {
      rawFilename = decodeURIComponent(encodedMatch[1].trim());
    } catch {
      return null;
    }
  }

  if (!rawFilename) return null;
  const safeFilename = Array.from(rawFilename, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 || '\\/:*?"<>|'.includes(character)
      ? "_"
      : character;
  })
    .join("")
    .replace(/^\.+/, "")
    .trim();
  return safeFilename.toLowerCase().endsWith(".xlsx")
    ? safeFilename
    : null;
};

const fetchReportBlob = async (
  params: DownloadReportParams,
  accessToken: string,
): Promise<ReportDownload> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/reports/generate-szamlamelleklet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        company_id: params.companyId,
        client_ids: params.clientIds,
        period_text: params.periodText,
        start_date: params.startDate,
        end_date: params.endDate,
        update_remaining_hours: params.updateRemainingHours ?? false,
      }),
    },
  );

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    if (response.status === 404) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentNoBillableEntries"));
    }
    throw new Error(
      getErrorMessage(errorData) ||
        `Failed to generate invoice attachments (HTTP ${response.status}).`,
    );
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes(XLSX_CONTENT_TYPE)) {
    throw new Error("The report service returned an invalid file type.");
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("The report service returned an empty file.");
  }

  return {
    blob,
    filename: getReportFilename(response.headers.get("Content-Disposition")),
  };
};

export async function downloadSzamlamellekletReport(
  params: DownloadReportParams,
): Promise<void> {
  const {
    companyId,
    clientIds,
    periodText,
    startDate,
    endDate,
    language,
    updateRemainingHours,
  } = params;
  // Retrieve current active session token from Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Nincs aktív munkamenet / hiányzó autentikáció.");
  }

  const { blob, filename } = await fetchReportBlob(
    {
      companyId,
      clientIds,
      periodText,
      startDate,
      endDate,
      language,
      updateRemainingHours,
    },
    session.access_token,
  );

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download =
    filename ??
    (language === "hu"
      ? `szamlamelleklet_${startDate}_${endDate}.xlsx`
      : `invoice_attachments_${startDate}_${endDate}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1_000);
}
