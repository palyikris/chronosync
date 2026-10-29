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
  | "group_tax_number"
  | "billing_email"
  | "send_invoice_email"
  | "payment_method"
  | "vat_code"
>;

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const getBillingProfileReadiness = (
  profile: ProfileForReadiness,
): BillingProfileReadiness => {
  const hasGroupTaxNumber = hasText(profile.group_tax_number);
  const fields: Array<[BillingProfileField, boolean]> = [
    ["billingName", hasText(profile.billing_name)],
    [
      "billingCountryCode",
      /^[A-Z]{2}$/.test(profile.billing_country_code.trim().toUpperCase()),
    ],
    ["billingPostalCode", hasText(profile.billing_postal_code)],
    ["billingCity", hasText(profile.billing_city)],
    ["billingAddress", hasText(profile.billing_address)],
    [
      "taxSubject",
      profile.tax_subject !== null &&
        (!hasGroupTaxNumber || profile.tax_subject === 1),
    ],
    ["paymentMethod", hasText(profile.payment_method)],
    [
      "vatCode",
      hasText(profile.vat_code) &&
        profile.vat_code.trim().toUpperCase() !== "K.AFA",
    ],
  ];

  if (profile.tax_subject === 1 || profile.tax_subject === 7) {
    fields.push([
      "taxNumber",
      hasGroupTaxNumber
        ? /^[0-9]{8}-4-[0-9]{2}$/.test(profile.tax_number?.trim() ?? "")
        : hasText(profile.tax_number),
    ]);
  }

  if (hasGroupTaxNumber) {
    fields.push([
      "groupTaxNumber",
      /^[0-9]{8}-5-[0-9]{2}$/.test(profile.group_tax_number?.trim() ?? ""),
    ]);
  }

  if (profile.tax_subject === -1) {
    if (hasText(profile.tax_number)) fields.push(["taxNumber", false]);
    if (hasText(profile.eu_vat_number)) fields.push(["euVatNumber", false]);
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
