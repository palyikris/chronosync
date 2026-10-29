export interface ProjectPricing {
  project_id: string;
  company_id: string;
  pricing_year: number;
  original_fee: number | null;
  original_fee_text: string | null;
  original_currency: string | null;
  original_unit: string | null;
  indexed_fee: number | null;
  unit: string;
  currency: string;
  index_code: "ksh" | "eu" | "none" | null;
}

export interface CompanyPriceIndex {
  company_id: string;
  index_code: "ksh" | "eu";
  effective_year: number;
  rate: number;
}
