// src/services/companyService.ts
import { supabase } from "../lib/supabaseClient";
import {
  type Company,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "../types/company";
import type {
  InvoiceProvider,
  InvoiceSettings,
} from "../types/company-settings";

const getInvoiceApiUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("Invoice settings API is not configured.");
  return `${apiBaseUrl.replace(/\/$/, "")}/company/invoice-settings`;
};

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated.");
  return session.access_token;
};

export const companyService = {
  async getInvoiceSettings(companyId: string): Promise<InvoiceSettings> {
    const response = await fetch(
      `${getInvoiceApiUrl()}?company_id=${encodeURIComponent(companyId)}`,
      { headers: { Authorization: `Bearer ${await getAccessToken()}` } },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to load invoice settings.");
    }
    return response.json() as Promise<InvoiceSettings>;
  },

  async updateInvoiceSettings(
    companyId: string,
    provider: InvoiceProvider,
    apiKey?: string,
    testMode?: boolean,
  ): Promise<InvoiceSettings> {
    const response = await fetch(getInvoiceApiUrl(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        company_id: companyId,
        invoice_provider: provider,
        ...(apiKey ? { api_key: apiKey } : {}),
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to save invoice settings.");
    }

    if (provider === "szamlazz_hu" && testMode !== undefined) {
      const { error } = await supabase
        .from("companies")
        .update({ szamlazz_test_mode: testMode })
        .eq("id", companyId);
      if (error) throw error;
    }

    return response.json() as Promise<InvoiceSettings>;
  },

  // Get all companies including active user count
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, billing_email, szamlazz_test_mode, is_active, is_deleted, deleted_at, leave_client_id, leave_project_id, created_at, profiles(count)",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    type CompanyRow = Company & {
      profiles?: Array<{ count?: number }>;
    };

    return ((data || []) as CompanyRow[]).map((row) => ({
      ...row,
      user_count: row.profiles ? row.profiles[0]?.count || 0 : 0,
    }));
  },

  async fetchCompany(companyId: string): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, billing_email, szamlazz_test_mode, is_active, is_deleted, deleted_at, leave_client_id, leave_project_id, created_at",
      )
      .eq("id", companyId)
      .single();
    if (error) throw error;
    return data;
  },

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        billing_email: input.billing_email || null,
        szamlazz_test_mode: input.szamlazz_test_mode ?? true,
        is_active: input.is_active ?? true,
        is_deleted: false,
        leave_client_id: input.leave_client_id ?? null,
        leave_project_id: input.leave_project_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCompanyLeaveConfig(companyId: string): Promise<{
    leave_client_id: string | null;
    leave_project_id: string | null;
  }> {
    if (!companyId) {
      return { leave_client_id: null, leave_project_id: null };
    }

    const { data, error } = await supabase
      .from("companies")
      .select("leave_client_id, leave_project_id")
      .eq("id", companyId)
      .maybeSingle();

    if (error) throw error;

    return {
      leave_client_id: data?.leave_client_id ?? null,
      leave_project_id: data?.leave_project_id ?? null,
    };
  },

  async updateCompanyLeaveConfig(
    companyId: string,
    input: Pick<UpdateCompanyInput, "leave_client_id" | "leave_project_id">,
  ): Promise<Company> {
    if (!companyId) {
      throw new Error("Company id is required.");
    }

    const { data, error } = await supabase
      .from("companies")
      .update({
        leave_client_id: input.leave_client_id ?? null,
        leave_project_id: input.leave_project_id ?? null,
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async toggleActiveStatus(id: string, isActive: boolean): Promise<Company> {
    return this.updateCompany(id, { is_active: isActive });
  },

  // Soft delete (sets is_deleted to true and timestamps deleted_at)
  async softDeleteCompany(id: string): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Restore soft-deleted company
  async restoreCompany(id: string): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .update({
        is_deleted: false,
        is_active: true,
        deleted_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hard delete (permanent removal)
  async hardDeleteCompany(id: string): Promise<void> {
    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) throw error;
  },
};
