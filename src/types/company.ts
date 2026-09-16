// src/types/company.ts
export interface Company {
  id: string;
  name: string;
  billing_email: string | null;
  szamlazz_token: string | null;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  leave_client_id: string | null;
  leave_project_id: string | null;
  created_at: string;
  user_count?: number; // Joined/aggregated user count
}

export interface CreateCompanyInput {
  name: string;
  billing_email?: string;
  szamlazz_token?: string;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}

export interface UpdateCompanyInput {
  name?: string;
  billing_email?: string | null;
  szamlazz_token?: string | null;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}
