export const INVOICE_LANGUAGES = [
  "hu",
  "en",
  "de",
  "it",
  "ro",
  "sk",
  "hr",
  "fr",
  "es",
  "cz",
  "pl",
  "bg",
  "nl",
  "ru",
  "si",
] as const;

export const TAX_SUBJECTS = [-1, 0, 1, 6, 7] as const;

export type InvoiceLanguage = (typeof INVOICE_LANGUAGES)[number];
export type TaxSubject = (typeof TAX_SUBJECTS)[number];

export interface ClientBillingProfile {
  client_id: string;
  company_id: string;
  billing_name: string | null;
  billing_country_code: string;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_address: string | null;
  tax_subject: TaxSubject | null;
  tax_number: string | null;
  eu_vat_number: string | null;
  group_tax_number: string | null;
  billing_email: string | null;
  send_invoice_email: boolean;
  invoice_language: InvoiceLanguage;
  payment_method: string;
  payment_term_days: number;
  vat_code: string;
  automatic_invoicing_enabled: boolean;
  invoice_schedule_day: number;
  attach_timesheet_report: boolean;
  created_at: string;
  updated_at: string;
}

export type ClientBillingProfileUpsert = Omit<
  ClientBillingProfile,
  "created_at" | "updated_at"
>;

export type BillingProfileField =
  | "billingName"
  | "billingCountryCode"
  | "billingPostalCode"
  | "billingCity"
  | "billingAddress"
  | "taxSubject"
  | "taxNumber"
  | "euVatNumber"
  | "groupTaxNumber"
  | "billingEmail"
  | "paymentMethod"
  | "vatCode";

export interface BillingProfileReadiness {
  complete: boolean;
  completedCount: number;
  totalCount: number;
  missingFields: BillingProfileField[];
}

export interface InvoiceReviewRecipient {
  name: string;
  country: string | null;
  postal_code: string;
  city: string;
  address: string;
  email: string | null;
  send_email: boolean;
  tax_subject: TaxSubject;
  tax_number: string | null;
  eu_tax_number: string | null;
  group_tax_number: string | null;
}

export interface InvoiceReviewEntry {
  id: string;
  work_date: string;
  hours_logged: number;
  billing_multiplier?: number;
  description: string;
  project_name: string;
  project_id?: string;
}

export interface ClientInvoiceReview {
  company_id: string;
  client_id: string;
  client_code: string;
  client_name: string;
  period_start: string;
  period_end: string;
  issue_date: string;
  fulfillment_date: string;
  due_date: string;
  payment_method: string;
  language: InvoiceLanguage;
  billing_model: "project";
  item_name: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  vat_code: string;
  currency: string;
  exchange_rate_bank?: string | null;
  billing_profile_updated_at?: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  recipient: InvoiceReviewRecipient;
  approved_entries: InvoiceReviewEntry[];
  project_quantities: Record<string, number>;
  items: InvoiceReviewProjectLine[];
  review_fingerprint: string;
}

export type InvoiceLedgerStatus =
  | "issuing"
  | "issued"
  | "uncertain"
  | "failed";

export interface InvoiceHistoryItem {
  id: string;
  company_id: string;
  client_id: string;
  client_name: string;
  period_start: string;
  period_end: string;
  status: InvoiceLedgerStatus;
  provider: "szamlazz_hu";
  external_id: string;
  recipient_name: string;
  recipient_email: string | null;
  send_email: boolean;
  quantity: number;
  unit: string;
  net_unit_price: number;
  vat_code: string;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
  invoice_number: string | null;
  pdf_available: boolean;
  provider_error_code: string | null;
  provider_error_message: string | null;
  attempt_count: number;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceReviewProjectLine {
  project_id: string;
  project_name: string;
  is_payroll?: boolean;
  logged_hours?: number | null;
  pricing_year: number;
  pricing_updated_at: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  vat_code: string;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
}
