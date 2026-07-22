export type CompanyUserRole = "company_admin" | "super_admin" | "regular";

export interface CreateCompanyUserPayload {
  email: string;
  password?: string;
  full_name: string;
  role: CompanyUserRole;
  company_id: string;
}