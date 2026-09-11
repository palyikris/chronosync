import { supabase } from "../lib/supabaseClient";

interface DownloadReportParams {
  periodText?: string;
  startDate?: string;
  endDate?: string;
  clientCodes: string[];
  language: string;
}

export async function downloadSzamlamellekletReport(
  params: DownloadReportParams,
): Promise<void> {
  const { clientCodes, periodText, startDate, endDate, language } = params;
  // Retrieve current active session token from Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Nincs aktív munkamenet / hiányzó autentikáció.");
  }

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
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        client_codes: clientCodes,
        period_text: periodText,
        start_date: startDate,
        end_date: endDate,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || "Hiba történt a számlamelléklet generálása során.",
    );
  }

  // Trigger file save in browser
  const blob = await response.blob();
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
