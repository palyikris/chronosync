import { supabase } from "../lib/supabaseClient";

interface DownloadReportParams {
  periodText?: string;
  startDate?: string;
  endDate?: string;
  clientCodes: string[];
  language: string;
  updateRemainingHours?: boolean;
}

const reportBlobCache = new Map<string, Promise<Blob>>();

const buildReportCacheKey = (
  {
    clientCodes,
    periodText,
    startDate,
    endDate,
    updateRemainingHours,
  }: DownloadReportParams,
  accessToken: string,
) =>
  JSON.stringify({
    accessToken,
    clientCodes,
    periodText,
    startDate,
    endDate,
    updateRemainingHours: Boolean(updateRemainingHours),
  });

const fetchReportBlob = async (
  params: DownloadReportParams,
  accessToken: string,
): Promise<Blob> => {
  const cacheKey = buildReportCacheKey(params, accessToken);
  const cachedBlobPromise = reportBlobCache.get(cacheKey);

  if (cachedBlobPromise) {
    return cachedBlobPromise;
  }

  const blobPromise = (async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      throw new Error("API base URL is not configured.");
    }

    const response = await fetch(
      `${apiBaseUrl}/reports/generate-szamlamelleklet`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          client_codes: params.clientCodes,
          period_text: params.periodText,
          start_date: params.startDate,
          end_date: params.endDate,
          update_remaining_hours: params.updateRemainingHours ?? false,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "Hiba történt a számlamelléklet generálása során.",
      );
    }

    return response.blob();
  })();

  reportBlobCache.set(cacheKey, blobPromise);

  try {
    return await blobPromise;
  } catch (error) {
    reportBlobCache.delete(cacheKey);
    throw error;
  }
};

export async function downloadSzamlamellekletReport(
  params: DownloadReportParams,
): Promise<void> {
  const {
    clientCodes,
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

  const blob = await fetchReportBlob(
    {
      clientCodes,
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
    language === "hu" ? `szamlamelleklet.xlsx` : `invoice_attachment.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
