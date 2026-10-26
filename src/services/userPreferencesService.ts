import { supabase } from "../lib/supabaseClient";
import { uuidSchema } from "../lib/zodSchemas";
import { fetchAllRows } from "../utils/fetchAllRows";
import { favoriteProjectPayloadSchema } from "../types/user-preferences";
import type { FavoriteProjectPayload, SavedFavoriteProject } from "../types/user-preferences";

const favoriteSelection = "id, project_id, project:projects(client_id, company_id, name, is_active, client:clients(name, is_active))";

type FavoriteRow = Pick<SavedFavoriteProject, "id" | "project_id"> & {
  project: {
    client_id: string;
    company_id: string;
    name: string;
    is_active: boolean;
    client: { name: string; is_active: boolean } | null;
  } | null;
};

const toFavoriteProject = (row: FavoriteRow): SavedFavoriteProject => ({
  id: row.id,
  project_id: row.project_id,
  client_id: row.project?.client_id ?? "",
  company_id: row.project?.company_id ?? "",
  project_name: row.project?.name ?? "",
  client_name: row.project?.client?.name ?? "",
  is_available: Boolean(row.project?.is_active && row.project.client?.is_active),
});

export async function fetchFavoriteProjects(userId: string): Promise<SavedFavoriteProject[]> {
  const ownerId = uuidSchema.parse(userId);
  const rows = await fetchAllRows<FavoriteRow>((from, to) => supabase
    .from("user_favorite_projects")
    .select(favoriteSelection)
    .eq("user_id", ownerId)
    .order("created_at").order("id")
    .range(from, to).overrideTypes<FavoriteRow[], { merge: false }>());
  return rows.map(toFavoriteProject);
}

export async function saveFavoriteProject(
  payload: FavoriteProjectPayload,
  id?: string,
): Promise<SavedFavoriteProject> {
  const validated = favoriteProjectPayloadSchema.parse(payload);
  const query = id
    ? supabase.from("user_favorite_projects").update(validated).eq("id", uuidSchema.parse(id))
    : supabase.from("user_favorite_projects").upsert(validated, { onConflict: "user_id,project_id" });
  // Ownership and project access are enforced by RLS, including when an ID is supplied.
  const { data, error } = await query.select(favoriteSelection).single()
    .overrideTypes<FavoriteRow, { merge: false }>();
  if (error) throw error;
  return toFavoriteProject(data);
}

export async function deleteFavoriteProject(id: string): Promise<void> {
  const { error } = await supabase.from("user_favorite_projects")
    .delete().eq("id", uuidSchema.parse(id)).select("id").single();
  if (error) throw error;
}
