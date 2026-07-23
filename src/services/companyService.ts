// src/services/companyService.ts
import { supabase } from "../lib/supabaseClient";
import {
  type Company,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "../types/company";

export const companyService = {
  // Get all companies including active user count
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("*, profiles(count)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      user_count: row.profiles ? row.profiles[0]?.count || 0 : 0,
    }));
  },

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        billing_email: input.billing_email || null,
        szamlazz_token: input.szamlazz_token || null,
        is_active: input.is_active ?? true,
        is_deleted: false,
      })
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
