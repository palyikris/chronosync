import { supabase } from "../lib/supabaseClient";
import { type Client, type Project } from "../types/client-project";

// --- CLIENTS ---
export async function fetchClients(companyId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function fetchActiveClients(companyId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function createClient(
  companyId: string,
  name: string,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ company_id: companyId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(
  clientId: string,
  name: string,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({ name })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientActivity(
  clientId: string,
  isActive: boolean,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({ is_active: isActive })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
}

// --- PROJECTS ---
export async function fetchProjects(
  companyId: string,
  clientId?: string,
): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("company_id", companyId);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query.order("name");
  if (error) throw error;
  return data || [];
}

export async function fetchActiveProjects(
  companyId: string,
  clientId?: string,
): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*, clients!inner(name, is_active)")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq("clients.is_active", true);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query.order("name");
  if (error) throw error;
  return data || [];
}

export async function createProject(
  companyId: string,
  clientId: string,
  name: string,
  description?: string,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ company_id: companyId, client_id: clientId, name, description })
    .select("*, clients(name)")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  projectId: string,
  name: string,
  description?: string,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ name, description })
    .eq("id", projectId)
    .select("*, clients(name)")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjectActivity(
  projectId: string,
  isActive: boolean,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ is_active: isActive })
    .eq("id", projectId)
    .select("*, clients(name)")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}

export const clientProjectService = {
  fetchClients,
  fetchActiveClients,
  createClient,
  updateClient,
  updateClientActivity,
  deleteClient,
  fetchProjects,
  fetchActiveProjects,
  createProject,
  updateProject,
  updateProjectActivity,
  deleteProject,
};

export default clientProjectService;
