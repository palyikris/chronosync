import { z } from "zod";
import type { TimesheetFavoriteProject } from "./timesheet";
import { uuidSchema } from "../lib/zodSchemas";

export const favoriteProjectPayloadSchema = z.object({ project_id: uuidSchema }).strict();
export type FavoriteProjectPayload = z.infer<typeof favoriteProjectPayloadSchema>;

export interface SavedFavoriteProject extends TimesheetFavoriteProject {
  id: string;
  company_id: string;
  project_name: string;
  client_name: string;
  is_available: boolean;
}
