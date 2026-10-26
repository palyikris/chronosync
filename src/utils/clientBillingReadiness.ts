import type {
  BillingProfileField,
  BillingProfileReadiness,
  ClientBillingProfile,
  ClientBillingProfileUpsert,
} from "../types/client-billing";

type ProfileForReadiness = Pick<
  ClientBillingProfile | ClientBillingProfileUpsert,
  | "billing_name"
  | "billing_country_code"
  | "billing_postal_code"
  | "billing_city"
  | "billing_address"
  | "tax_subject"
  | "tax_number"
  | "eu_vat_number"
  | "billing_email"
  | "send_invoice_email"
  | "net_unit_price"
  | "payment_method"
  | "invoice_item_name"
  | "invoice_unit"
  | "vat_code"
>;

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const getBillingProfileReadiness = (
  profile: ProfileForReadiness,
): BillingProfileReadiness => {
  const fields: Array<[BillingProfileField, boolean]> = [
    ["billingName", hasText(profile.billing_name)],
    [
      "billingCountryCode",
      /^[A-Z]{2}$/.test(profile.billing_country_code.trim().toUpperCase()),
    ],
    ["billingPostalCode", hasText(profile.billing_postal_code)],
    ["billingCity", hasText(profile.billing_city)],
    ["billingAddress", hasText(profile.billing_address)],
    ["taxSubject", profile.tax_subject !== null],
    [
      "netUnitPrice",
      profile.net_unit_price !== null &&
        Number.isFinite(profile.net_unit_price) &&
        profile.net_unit_price >= 0,
    ],
    ["paymentMethod", hasText(profile.payment_method)],
    ["invoiceItemName", hasText(profile.invoice_item_name)],
    ["invoiceUnit", hasText(profile.invoice_unit)],
    ["vatCode", hasText(profile.vat_code)],
  ];

  if (profile.tax_subject === 1 || profile.tax_subject === 7) {
    fields.push(["taxNumber", hasText(profile.tax_number)]);
  }

  if (profile.tax_subject === 6) {
    fields.push(["euVatNumber", hasText(profile.eu_vat_number)]);
  }

  if (profile.send_invoice_email) {
    fields.push(["billingEmail", hasText(profile.billing_email)]);
  }

  const missingFields = fields
    .filter(([, complete]) => !complete)
    .map(([field]) => field);

  return {
    complete: missingFields.length === 0,
    completedCount: fields.length - missingFields.length,
    totalCount: fields.length,
    missingFields,
  };
};
