import type { ModuleId } from "../modules/catalog";
export interface Company {
  id: string;
  enabled_modules: ModuleId[];
  name: string;
  billing_email: string | null;
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
  enabled_modules?: ModuleId[];
  name: string;
  billing_email?: string;
  szamlazz_test_mode?: boolean;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}

export interface UpdateCompanyInput {
  enabled_modules?: ModuleId[];
  name?: string;
  billing_email?: string | null;
  szamlazz_test_mode?: boolean;
  is_active?: boolean;
  leave_client_id?: string | null;
  leave_project_id?: string | null;
}
