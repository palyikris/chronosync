import { z } from "zod";
import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  INVOICE_LANGUAGES,
  TAX_SUBJECTS,
  type ClientBillingProfile,
  type ClientBillingProfileUpsert,
  type ClientInvoiceReview,
  type InvoiceHistoryItem,
} from "../types/client-billing";
import { getBillingProfileReadiness } from "../utils/clientBillingReadiness";

const nullableText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((value) => value || null);

const profileSchema = z
  .object({
    client_id: z.string().uuid(),
    company_id: z.string().uuid(),
    billing_name: nullableText(255),
    billing_country_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    billing_postal_code: nullableText(32),
    billing_city: nullableText(120),
    billing_address: nullableText(255),
    tax_subject: z.union([
      z.literal(TAX_SUBJECTS[0]),
      z.literal(TAX_SUBJECTS[1]),
      z.literal(TAX_SUBJECTS[2]),
      z.literal(TAX_SUBJECTS[3]),
      z.literal(TAX_SUBJECTS[4]),
      z.null(),
    ]),
    tax_number: nullableText(32),
    eu_vat_number: nullableText(32),
    group_tax_number: nullableText(32),
    billing_email: z
      .union([z.string().trim().email().max(255), z.literal(""), z.null()])
      .transform((value) => value || null),
    send_invoice_email: z.boolean(),
    invoice_language: z.enum(INVOICE_LANGUAGES),
    payment_method: z.string().trim().min(1).max(64),
    payment_term_days: z.number().int().min(0).max(365),
    vat_code: z.string().trim().min(1).max(16),
    automatic_invoicing_enabled: z.boolean(),
    invoice_schedule_day: z.number().int().min(1).max(28),
    attach_timesheet_report: z.boolean(),
  })
  .strict()
  .superRefine((profile, context) => {
    if (profile.send_invoice_email && !profile.billing_email) {
      context.addIssue({
        code: "custom",
        path: ["billing_email"],
        message: "Billing email is required when email delivery is enabled.",
      });
    }

    if (
      profile.automatic_invoicing_enabled &&
      !getBillingProfileReadiness(profile).complete
    ) {
      context.addIssue({
        code: "custom",
        path: ["automatic_invoicing_enabled"],
        message: "Complete the billing profile before enabling automation.",
      });
    }
  });

const PROFILE_COLUMNS = [
  "client_id",
  "company_id",
  "billing_name",
  "billing_country_code",
  "billing_postal_code",
  "billing_city",
  "billing_address",
  "tax_subject",
  "tax_number",
  "eu_vat_number",
  "group_tax_number",
  "billing_email",
  "send_invoice_email",
  "invoice_language",
  "payment_method",
  "payment_term_days",
  "vat_code",
  "automatic_invoicing_enabled",
  "invoice_schedule_day",
  "attach_timesheet_report",
  "created_at",
  "updated_at",
].join(",");

export const fetchClientBillingProfiles = async (
  companyId: string,
): Promise<ClientBillingProfile[]> => {
  const { data, error } = await supabase
    .from("client_billing_profiles")
    .select(PROFILE_COLUMNS)
    .eq("company_id", companyId)
    .order("billing_name");

  if (error) throw error;
  return (data ?? []) as unknown as ClientBillingProfile[];
};

export const saveClientBillingProfile = async (
  input: ClientBillingProfileUpsert,
): Promise<ClientBillingProfile> => {
  const validation = profileSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]?.message || "Invalid billing profile.",
    );
  }

  const payload = {
    ...validation.data,
    // Scheduling is intentionally out of scope for the manual invoice workflow.
    automatic_invoicing_enabled: false,
    invoice_schedule_day: 1,
  };
  const { data, error } = await supabase
    .from("client_billing_profiles")
    .upsert(payload, { onConflict: "client_id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as ClientBillingProfile;
};

interface DownloadClientInvoicePreviewParams {
  companyId: string;
  clientId: string;
  clientCode: string;
  periodStart: string;
  periodEnd: string;
  projectQuantities?: Record<string, number>;
}

const getInvoicePreviewApiUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(i18n.t("clientBilling.previewApiNotConfigured"));
  }
  return `${apiBaseUrl.replace(/\/$/, "")}/invoices/client-preview`;
};

const getInvoiceApiBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(i18n.t("clientBilling.previewApiNotConfigured"));
  }
  return `${apiBaseUrl.replace(/\/$/, "")}/invoices`;
};

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error(i18n.t("clientBilling.previewAuthenticationRequired"));
  }
  return session.access_token;
};

const getInvoiceApiError = async (response: Response) => {
  const errorData: unknown = await response.json().catch(() => null);
  const detail =
    errorData &&
    typeof errorData === "object" &&
    "detail" in errorData &&
    typeof errorData.detail === "string"
      ? errorData.detail
      : null;
  return detail ?? i18n.t("clientBilling.invoiceRequestFailed");
};

const getPreviewErrorMessage = async (response: Response): Promise<string> => {
  const errorData: unknown = await response.json().catch(() => null);
  const detail =
    errorData &&
    typeof errorData === "object" &&
    "detail" in errorData &&
    typeof errorData.detail === "string"
      ? errorData.detail
      : null;

  if (response.status === 401) {
    return i18n.t("clientBilling.previewAuthenticationRequired");
  }
  if (response.status === 403) {
    return i18n.t("clientBilling.previewAdminRequired");
  }
  if (response.status === 404 && detail?.startsWith("No approved")) {
    return i18n.t("clientBilling.previewNoApprovedHours");
  }
  if (response.status === 404) {
    return i18n.t("clientBilling.previewConfigurationMissing");
  }
  if (response.status === 409) {
    return detail ?? i18n.t("clientBilling.previewProfileConflict");
  }
  if (response.status === 413) {
    return i18n.t("clientBilling.previewTooManyEntries");
  }
  if (response.status === 422) {
    return detail ?? i18n.t("clientBilling.previewRejected");
  }
  if (response.status === 502) {
    return i18n.t("clientBilling.previewProviderUnavailable");
  }
  return detail ?? i18n.t("clientBilling.previewFailed");
};

export const downloadClientInvoicePreview = async ({
  companyId,
  clientId,
  clientCode,
  periodStart,
  periodEnd,
  projectQuantities = {},
}: DownloadClientInvoicePreviewParams): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error(i18n.t("clientBilling.previewAuthenticationRequired"));
  }

  const response = await fetch(getInvoicePreviewApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      company_id: companyId,
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      project_quantities: projectQuantities,
    }),
  });

  if (!response.ok) {
    throw new Error(await getPreviewErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/pdf")) {
    throw new Error(i18n.t("clientBilling.previewInvalidFile"));
  }

  const blob = await response.blob();
  const signature = new TextDecoder().decode(await blob.slice(0, 4).arrayBuffer());
  if (blob.size === 0 || signature !== "%PDF") {
    throw new Error(i18n.t("clientBilling.previewInvalidFile"));
  }

  const safeClientCode =
    clientCode.replace(/[^a-z0-9]/gi, "").slice(0, 16) || "client";
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `invoice-preview-${safeClientCode}-${periodStart}-${periodEnd}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1_000);
};

interface ClientInvoicePeriodParams {
  companyId: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  projectQuantities?: Record<string, number>;
}

const normalizeInvoiceReview = (value: ClientInvoiceReview): ClientInvoiceReview => {
  if (value.billing_model !== "project" || !value.items?.length) {
    throw new Error(i18n.t("clientBilling.projectPricingUnavailable"));
  }
  return ({
  ...value,
  quantity: Number(value.quantity),
  net_unit_price: Number(value.net_unit_price),
  net_total: Number(value.net_total),
  vat_total: Number(value.vat_total),
  gross_total: Number(value.gross_total),
  project_quantities: Object.fromEntries(Object.entries(value.project_quantities ?? {}).map(([key, quantity]) => [key, Number(quantity)])),
  items: (value.items ?? []).map(item => ({ ...item, quantity: Number(item.quantity), net_unit_price: Number(item.net_unit_price),
    net_total: Number(item.net_total), vat_total: Number(item.vat_total), gross_total: Number(item.gross_total) })),
  approved_entries: value.approved_entries.map((entry) => ({
    ...entry,
    hours_logged: Number(entry.hours_logged),
  })),
  });
};

const normalizeInvoiceHistoryItem = (
  value: InvoiceHistoryItem,
): InvoiceHistoryItem => ({
  ...value,
  quantity: Number(value.quantity),
  net_unit_price: Number(value.net_unit_price),
  net_total: Number(value.net_total),
  vat_total: Number(value.vat_total),
  gross_total: Number(value.gross_total),
});

export const reviewClientInvoice = async ({
  companyId,
  clientId,
  periodStart,
  periodEnd,
  projectQuantities = {},
}: ClientInvoicePeriodParams): Promise<ClientInvoiceReview> => {
  const response = await fetch(`${getInvoiceApiBaseUrl()}/client-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAccessToken()}`,
    },
    body: JSON.stringify({
      company_id: companyId,
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      project_quantities: projectQuantities,
    }),
  });
  if (!response.ok) throw new Error(await getInvoiceApiError(response));
  return normalizeInvoiceReview((await response.json()) as ClientInvoiceReview);
};

export const issueClientInvoice = async (
  review: ClientInvoiceReview,
): Promise<InvoiceHistoryItem> => {
  const response = await fetch(`${getInvoiceApiBaseUrl()}/client-issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAccessToken()}`,
    },
    body: JSON.stringify({
      company_id: review.company_id,
      client_id: review.client_id,
      period_start: review.period_start,
      period_end: review.period_end,
      review_fingerprint: review.review_fingerprint,
      project_quantities: review.project_quantities,
      confirm: true,
    }),
  });
  if (!response.ok) throw new Error(await getInvoiceApiError(response));
  return normalizeInvoiceHistoryItem(
    (await response.json()) as InvoiceHistoryItem,
  );
};

export const fetchInvoiceHistory = async (
  companyId: string,
): Promise<InvoiceHistoryItem[]> => {
  const query = new URLSearchParams({ company_id: companyId, limit: "50" });
  const response = await fetch(`${getInvoiceApiBaseUrl()}/history?${query}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!response.ok) throw new Error(await getInvoiceApiError(response));
  const items = (await response.json()) as InvoiceHistoryItem[];
  return items.map(normalizeInvoiceHistoryItem);
};

const downloadPdfResponse = async (response: Response, fallbackName: string) => {
  if (!response.ok) throw new Error(await getInvoiceApiError(response));
  const blob = await response.blob();
  const signature = new TextDecoder().decode(await blob.slice(0, 4).arrayBuffer());
  if (blob.size === 0 || signature !== "%PDF") {
    throw new Error(i18n.t("clientBilling.previewInvalidFile"));
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filenameMatch?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1_000);
};

export const downloadIssuedInvoicePdf = async (
  companyId: string,
  invoiceId: string,
) => {
  const query = new URLSearchParams({ company_id: companyId });
  const response = await fetch(
    `${getInvoiceApiBaseUrl()}/${encodeURIComponent(invoiceId)}/pdf?${query}`,
    { headers: { Authorization: `Bearer ${await getAccessToken()}` } },
  );
  await downloadPdfResponse(response, `invoice-${invoiceId}.pdf`);
};

export const reconcileInvoice = async (params: {
  companyId: string;
  invoiceId: string;
  resolution: "issued" | "not_issued";
  invoiceNumber?: string;
  netTotal?: number;
  grossTotal?: number;
}): Promise<InvoiceHistoryItem> => {
  const response = await fetch(
    `${getInvoiceApiBaseUrl()}/${encodeURIComponent(params.invoiceId)}/reconcile`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        company_id: params.companyId,
        resolution: params.resolution,
        confirm: true,
        ...(params.invoiceNumber
          ? { invoice_number: params.invoiceNumber }
          : {}),
        ...(params.netTotal !== undefined ? { net_total: params.netTotal } : {}),
        ...(params.grossTotal !== undefined
          ? { gross_total: params.grossTotal }
          : {}),
      }),
    },
  );
  if (!response.ok) throw new Error(await getInvoiceApiError(response));
  return normalizeInvoiceHistoryItem(
    (await response.json()) as InvoiceHistoryItem,
  );
};
