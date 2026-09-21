// src/types/company.ts
export interface Company {
  id: string;
  name: string;
  billing_email: string | null;
  szamla_agent_key: string | null;
  szamlazz_test_mode: boolean;
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
  szamla_agent_key?: string;
  szamlazz_test_mode?: boolean;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}

export interface UpdateCompanyInput {
  name?: string;
  billing_email?: string | null;
  szamla_agent_key?: string | null;
  szamlazz_test_mode?: boolean;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}
