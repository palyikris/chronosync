import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  getReportErrorMessage,
  getReportFilename,
} from "./invoiceAttachmentDownloadHelpers";

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

const fetchReportBlob = async (
  params: DownloadReportParams,
  accessToken: string,
): Promise<ReportDownload> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error(i18n.t("dashboard.invoiceAttachmentApiNotConfigured"));
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
    if (response.status === 401) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentAuthenticationRequired"));
    }
    if (response.status === 403) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentAdminRequired"));
    }
    if (response.status === 409) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentDataConflict"));
    }
    if (response.status === 413) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentReportTooLarge"));
    }
    if (response.status === 422) {
      throw new Error(i18n.t("dashboard.invoiceAttachmentInvalidRequest"));
    }
    throw new Error(
      getReportErrorMessage(errorData) ||
        i18n.t("dashboard.invoiceAttachmentGenerationHttpError", {
          status: response.status,
        }),
    );
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes(XLSX_CONTENT_TYPE)) {
    throw new Error(i18n.t("dashboard.invoiceAttachmentInvalidFileType"));
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error(i18n.t("dashboard.invoiceAttachmentEmptyFile"));
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
    throw new Error(i18n.t("dashboard.invoiceAttachmentAuthenticationRequired"));
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
