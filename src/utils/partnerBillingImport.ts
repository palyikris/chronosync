import type { Client } from "../types/client-project";
import type { ClientBillingProfile, TaxSubject } from "../types/client-billing";
import { isBillingEmail, splitBillingEmails, uniqueBillingEmails } from "./billingEmails.ts";

export const PARTNER_IMPORT_LIMIT = 5000;
export const PARTNER_IMPORT_FIELDS = [
  "billing_name", "client_code", "billing_country_code", "billing_postal_code",
  "billing_city", "billing_address", "tax_number", "eu_vat_number",
  "group_tax_number", "tax_subject", "billing_email", "payment_method", "payment_term_days",
] as const;
export type PartnerImportField = typeof PARTNER_IMPORT_FIELDS[number];
export type PartnerBillingField = Exclude<PartnerImportField, "client_code">;
export type PartnerBillingData = Partial<Record<Exclude<PartnerBillingField, "billing_email">, string | number>> & {
  billing_email?: string;
};
export type PartnerColumnMapping = Partial<Record<PartnerImportField, number>>;
export interface PartnerFileRow { rowNumber: number; values: string[] }
export interface PartnerFile { headers: string[]; rows: PartnerFileRow[]; sheetName: string }
export type PartnerImportIssue = "invalid" | "identityConflict" | "duplicate";
export interface PartnerReviewRow {
  rowNumber: number;
  name: string;
  data: PartnerBillingData;
  clientId: string | null;
  match: "tax" | "code" | "name" | "manual" | "none";
  changes: PartnerBillingField[];
  preserved: PartnerBillingField[];
  issues: PartnerImportIssue[];
  invalidFields: PartnerImportField[];
  emailOptions: string[];
  status: "ready" | "unmatched" | "unchanged" | "blocked" | "skipped";
}

export const normalizePartnerName = (value: unknown): string => String(value ?? "")
  .normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("hu")
  .replace(/[^\p{L}\p{N}]/gu, "");
export const normalizePartnerTax = (value: unknown): string => String(value ?? "")
  .toUpperCase().replace(/[^A-Z0-9]/g, "");
const normalizePartnerCode = (value: unknown): string => String(value ?? "").trim().toLocaleLowerCase("hu");
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== "";

// Labels used by Számlázz.hu's partner export, with the documented Agent codes.
const taxSubjectLabels = new Map<string, TaxSubject>([
  ["van magyar adószáma", 1],
  ["EU-s vállalkozás", 6],
  ["EU-n kívüli vállalkozás", 7],
  ["nem tudjuk hogy a vásárló adóalany-e", 0],
  ["nincs adószáma", -1],
  ["nincs adószáma (azaz nincs magyar adószáma)", -1],
].map(([label, subject]) => [normalizePartnerName(label), subject as TaxSubject]));

export function normalizePartnerTaxSubject(value: string): TaxSubject | null {
  const text = value.trim();
  if (/^(?:-1|0|1|6|7)$/.test(text)) return Number(text) as TaxSubject;
  return taxSubjectLabels.get(normalizePartnerName(text)) ?? null;
}


const aliases: Record<PartnerImportField, string[]> = {
  billing_name: ["partner neve", "partner név", "név", "cégnév", "vevő neve", "partner name", "customer name", "billing name", "client name"],
  client_code: ["client code", "ügyfélkód", "chrono ügyfélkód", "chronosync client code"],
  billing_country_code: ["ország", "country", "country code", "billing country"],
  billing_postal_code: ["irányítószám", "irsz", "postal code", "zip", "zip code"],
  billing_city: ["település", "város", "city", "town"],
  billing_address: ["utca és házszám", "cím", "utca házszám", "address", "street address"],
  tax_number: ["adószám", "tax number", "tax id"],
  eu_vat_number: ["közösségi adószám", "eu adószám", "eu vat number", "eu tax number"],
  group_tax_number: ["csoportos adószám", "csoportazonosító", "group tax number"],
  tax_subject: ["adóalany", "tax subject", "tax status"],
  billing_email: ["email cím", "email", "e-mail cím", "e-mail", "billing email"],
  payment_method: ["alapértelmezett fizetési mód", "fizetési mód", "payment method"],
  payment_term_days: ["fizetési határidő (nap)", "fizetési határidő nap", "payment term days", "payment terms days"],
};

export function suggestPartnerColumns(headers: string[]): PartnerColumnMapping {
  const mapping: PartnerColumnMapping = {};
  for (const field of PARTNER_IMPORT_FIELDS) {
    const matches = headers.flatMap((header, index) =>
      aliases[field].some(alias => normalizePartnerName(alias) === normalizePartnerName(header)) ? [index] : []);
    if (matches.length === 1) mapping[field] = matches[0];
  }
  return mapping;
}

let countries: Map<string, string> | undefined;
export function normalizePartnerCountry(value: string): string | null {
  if (!value.trim()) return null;
  if (!countries) {
    countries = new Map();
    const codes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
    for (const language of ["hu", "en"]) {
      const names = new Intl.DisplayNames([language], { type: "region" });
      for (const code of codes) {
        countries.set(normalizePartnerName(code), code);
        countries.set(normalizePartnerName(names.of(code)), code);
      }
    }
    countries.set("uk", "GB");
    countries.set("usa", "US");
  }
  return countries.get(normalizePartnerName(value)) ?? null;
}

const limits: Partial<Record<PartnerImportField, number>> = {
  billing_name: 255, billing_postal_code: 32, billing_city: 120, billing_address: 255,
  tax_number: 32, eu_vat_number: 32, group_tax_number: 32, payment_method: 64,
};

export function readPartnerRow(row: PartnerFileRow, mapping: PartnerColumnMapping, emailChoice?: string[]) {
  const data: PartnerBillingData = {};
  const invalidFields: PartnerImportField[] = [];
  let emailOptions: string[] = [];
  let code = "";
  for (const field of PARTNER_IMPORT_FIELDS) {
    const index = mapping[field];
    const text = index === undefined ? "" : String(row.values[index] ?? "").trim();
    if (!text) continue;
    if (field === "client_code") { code = text; continue; }
    if (field === "billing_country_code") {
      const country = normalizePartnerCountry(text);
      if (country) data[field] = country;
      else invalidFields.push(field);
    } else if (field === "tax_subject") {
      const subject = normalizePartnerTaxSubject(text);
      if (subject !== null) data[field] = subject;
      else invalidFields.push(field);
    } else if (field === "billing_email") {
      const emails = uniqueBillingEmails(splitBillingEmails(text));
      emailOptions = emails.filter(isBillingEmail);
      const selected = emailChoice ?? (emails.length === 1 && emailOptions.length === 1 ? emailOptions : undefined);
      const available = new Set(emailOptions);
      if (!selected || selected.some(email => !available.has(email))) invalidFields.push(field);
      else if (selected.length) data[field] = uniqueBillingEmails(selected).join(",");
    } else if (field === "payment_term_days") {
      if (/^\d+$/.test(text) && Number(text) <= 365) data[field] = Number(text);
      else invalidFields.push(field);
    } else if (text.length > (limits[field] ?? 255)) {
      invalidFields.push(field);
    } else data[field] = text;
  }
  return { data, code, invalidFields, emailOptions };
}

export function partnerIdentityConflicts(data: PartnerBillingData, profile?: ClientBillingProfile): boolean {
  if (!profile) return false;
  for (const field of ["billing_country_code", "tax_subject", "tax_number", "eu_vat_number", "group_tax_number"] as const) {
    if (hasValue(data[field]) && hasValue(profile[field]) && (field === "tax_subject" ?
      data[field] !== profile[field] : normalizePartnerTax(data[field]) !== normalizePartnerTax(profile[field]))) return true;
  }
  const subject = profile.tax_subject ?? data.tax_subject;
  if (subject === -1 && [data.tax_number, data.eu_vat_number, data.group_tax_number,
    profile.tax_number, profile.eu_vat_number, profile.group_tax_number].some(hasValue)) return true;
  const group = profile.group_tax_number ?? data.group_tax_number;
  const tax = profile.tax_number ?? data.tax_number;
  if (hasValue(group) && (subject !== 1 || !/^\d{8}-5-\d{2}$/.test(String(group)) ||
    !/^\d{8}-4-\d{2}$/.test(String(tax ?? "")))) return true;
  return false;
}

/** Never use a provider's partner identifier as ChronoSync's internal code. */
export function buildPartnerReview(
  file: PartnerFile, mapping: PartnerColumnMapping, clients: Client[],
  profiles: ClientBillingProfile[], companyId: string,
  choices: Record<number, string | null> = {},
  emailChoices: Record<number, string[]> = {},
): PartnerReviewRow[] {
  const scopedClients = clients.filter(client => client.company_id === companyId);
  const scopedProfiles = profiles.filter(profile => profile.company_id === companyId);
  const profileById = new Map(scopedProfiles.map(profile => [profile.client_id, profile]));
  const clientById = new Map(scopedClients.map(client => [client.id, client]));
  const index = (pairs: [string, string][]) => {
    const map = new Map<string, Set<string>>();
    for (const [key, id] of pairs) if (key && clientById.has(id)) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(id);
    }
    return map;
  };
  const taxIndex = index(scopedProfiles.flatMap(profile =>
    [profile.tax_number, profile.eu_vat_number].map(value => [normalizePartnerTax(value), profile.client_id] as [string, string])));
  const codeIndex = index(scopedClients.map(client => [normalizePartnerCode(client.client_code), client.id]));
  const nameIndex = index([
    ...scopedClients.map(client => [normalizePartnerName(client.name), client.id] as [string, string]),
    ...scopedProfiles.map(profile => [normalizePartnerName(profile.billing_name), profile.client_id] as [string, string]),
  ]);
  const rows = file.rows.map((row): PartnerReviewRow => {
    const { data, code, invalidFields, emailOptions } = readPartnerRow(row, mapping, emailChoices[row.rowNumber]);
    const taxMatches = new Set([data.tax_number, data.eu_vat_number].flatMap(value =>
      [...(taxIndex.get(normalizePartnerTax(value)) ?? [])]));
    const codeMatches = codeIndex.get(normalizePartnerCode(code)) ?? new Set<string>();
    const nameMatches = nameIndex.get(normalizePartnerName(data.billing_name)) ?? new Set<string>();
    let clientId: string | null = null;
    let match: PartnerReviewRow["match"] = "none";
    if (Object.hasOwn(choices, row.rowNumber)) {
      clientId = choices[row.rowNumber];
      if (clientId && !clientById.has(clientId)) clientId = null;
      match = clientId ? "manual" : "none";
    } else {
      const signals = [taxMatches, codeMatches, nameMatches];
      const first = signals.find(set => set.size > 0);
      if (first?.size === 1) {
        const id = [...first][0];
        if (signals.every(set => set.size === 0 || (set.size === 1 && set.has(id)))) {
          clientId = id;
          match = taxMatches.size ? "tax" : codeMatches.size ? "code" : "name";
        }
      }
    }
    const profile = clientId ? profileById.get(clientId) : undefined;
    const savedEmails = new Set(splitBillingEmails(profile?.billing_email).map(email => email.toLowerCase()));
    const addedEmails = splitBillingEmails(data.billing_email)
      .filter(email => !savedEmails.has(email.toLowerCase()));
    if (addedEmails.length) data.billing_email = addedEmails.join(",");
    const fields = Object.keys(data) as PartnerBillingField[];
    const changes = fields.filter(field => field === "billing_email" ? addedEmails.length > 0 : !hasValue(profile?.[field]));
    const preserved = fields.filter(field => !changes.includes(field));
    const issues: PartnerImportIssue[] = invalidFields.length ? ["invalid"] : [];
    if (partnerIdentityConflicts(data, profile)) issues.push("identityConflict");
    // Validate incoming identity even for a client without a saved profile.
    if (!profile && ((data.tax_subject === -1 && [data.tax_number, data.eu_vat_number, data.group_tax_number].some(hasValue)) ||
      (hasValue(data.group_tax_number) && (data.tax_subject !== 1 ||
        !/^\d{8}-5-\d{2}$/.test(String(data.group_tax_number)) || !/^\d{8}-4-\d{2}$/.test(String(data.tax_number ?? "")))))) {
      issues.push("identityConflict");
    }
    return {
      rowNumber: row.rowNumber, name: String(data.billing_name ?? code), data, clientId, match, changes, preserved, issues, invalidFields, emailOptions,
      status: Object.hasOwn(choices, row.rowNumber) && choices[row.rowNumber] === null ? "skipped" :
        !clientId ? "unmatched" : issues.length ? "blocked" : changes.length ? "ready" : "unchanged",
    };
  });
  const counts = new Map<string, number>();
  for (const row of rows) if (row.clientId) counts.set(row.clientId, (counts.get(row.clientId) ?? 0) + 1);
  return rows.map(row => row.clientId && counts.get(row.clientId)! > 1 ?
    { ...row, status: "blocked", issues: [...row.issues, "duplicate"] } : row);
}
