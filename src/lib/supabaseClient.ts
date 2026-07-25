import { createClient } from "@supabase/supabase-js";
import i18n from "./i18n";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(i18n.t("errors.missingSupabaseEnv"));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
