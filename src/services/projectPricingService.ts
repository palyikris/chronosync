import { supabase } from "../lib/supabaseClient";
import { fetchAllRows } from "../utils/fetchAllRows";
import type { CompanyPriceIndex, ProjectPricing } from "../types/project-pricing";
import { z } from "zod";

const pricingSchema = z.object({
  project_id: z.string().uuid(),
  company_id: z.string().uuid(),
  pricing_year: z.number().int().min(2000).max(9999),
  indexed_fee: z.number().finite().min(0).max(9999999999).nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  unit: z.string().trim().min(1).max(32),
  index_code: z.enum(["ksh", "eu", "none"]).nullable(),
}).strict();

export type ProjectPricingInput = z.infer<typeof pricingSchema>;

export async function fetchProjectPricing(companyId: string, year: number): Promise<ProjectPricing[]> {
  const { error } = await supabase.rpc("ensure_company_project_pricing", { p_company_id: companyId });
  if (error) throw error;
  return fetchAllRows<ProjectPricing>((from, to) => supabase
    .from("project_pricing")
    .select("project_id, company_id, pricing_year, original_fee, original_fee_text, original_currency, original_unit, indexed_fee, unit, currency, index_code")
    .eq("company_id", companyId)
    .eq("pricing_year", year)
    .order("project_id")
    .range(from, to));
}

export async function saveProjectPricing(input: ProjectPricingInput, existing: boolean): Promise<void> {
  const value = pricingSchema.parse(input);
  const query = existing
    ? supabase.from("project_pricing").update({
      indexed_fee: value.indexed_fee, currency: value.currency, unit: value.unit, source_formula: null,
      index_code: value.index_code, price_origin: "manual", generated_from_year: null, applied_index_rate: null,
    }).eq("company_id", value.company_id).eq("project_id", value.project_id).eq("pricing_year", value.pricing_year)
    : supabase.from("project_pricing").insert(value);
  const { error } = await query.select("project_id").single();
  if (error) throw error;
}

export function fetchCompanyPriceIndexes(companyId: string): Promise<CompanyPriceIndex[]> {
  return fetchAllRows<CompanyPriceIndex>((from, to) => supabase.from("company_price_indexes")
    .select("company_id,index_code,effective_year,rate").eq("company_id", companyId)
    .order("index_code").order("effective_year", { ascending: false }).range(from, to));
}

export async function saveCompanyPriceIndexes(companyId: string, year: number, rates: { ksh: string; eu: string }): Promise<void> {
  const rows = (["ksh", "eu"] as const).filter(code => rates[code].trim() !== "").map(code => ({
    company_id: z.string().uuid().parse(companyId), index_code: code,
    effective_year: z.number().int().min(2000).max(9999).parse(year),
    rate: z.number().finite().min(-1).max(10).parse(Number(rates[code]) / 100),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("company_price_indexes").upsert(rows, { onConflict: "company_id,index_code,effective_year" });
  if (error) throw error;
}
