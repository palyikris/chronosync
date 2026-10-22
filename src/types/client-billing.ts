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
export const BILLING_MODELS = ["hourly", "fixed_monthly"] as const;

export type InvoiceLanguage = (typeof INVOICE_LANGUAGES)[number];
export type TaxSubject = (typeof TAX_SUBJECTS)[number];
export type BillingModel = (typeof BILLING_MODELS)[number];

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
  currency: string;
  payment_method: string;
  payment_term_days: number;
  billing_model: BillingModel;
  net_unit_price: number | null;
  invoice_unit: string;
  vat_code: string;
  invoice_item_name: string;
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
  | "billingEmail"
  | "netUnitPrice"
  | "paymentMethod"
  | "invoiceItemName"
  | "invoiceUnit"
  | "vatCode";

export interface BillingProfileReadiness {
  complete: boolean;
  completedCount: number;
  totalCount: number;
  missingFields: BillingProfileField[];
}
