import { supabase } from "../lib/supabaseClient";
import {
  createClientPayloadSchema,
  createProjectPayloadSchema,
} from "../types/client-project";
import type { Client, Project } from "../types/client-project";

// Fetch all clients for the company
export async function fetchClients(companyId?: string): Promise<Client[]> {
  let query = supabase.from("clients").select("*").order("name", {
    ascending: true,
  });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Client[];
}

// Fetch all projects for the company (or filtered by client_id)
export async function fetchProjects(
  companyId?: string,
  clientId?: string,
): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Project[];
}

// Create Client
export async function createClient(
  name: string,
  companyId: string,
): Promise<Client> {
  const validatedPayload = createClientPayloadSchema.parse({
    name,
    company_id: companyId,
  });

  const { data, error } = await supabase
    .from("clients")
    .insert([
      {
        name: validatedPayload.name,
        company_id: validatedPayload.company_id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

// Create Project for a Client
export async function createProject(
  name: string,
  clientId: string,
  companyId: string,
): Promise<Project> {
  const validatedPayload = createProjectPayloadSchema.parse({
    name,
    client_id: clientId,
    company_id: companyId,
  });

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        name: validatedPayload.name,
        client_id: validatedPayload.client_id,
        company_id: validatedPayload.company_id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}
