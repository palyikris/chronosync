import { createClient } from "@supabase/supabase-js";
import i18n from "./i18n";
import { isDemoDocument, serviceFetch, supabaseEndpoint, supabasePublicKey } from "./serviceEnvironment";

const supabaseUrl = supabaseEndpoint;
const supabaseAnonKey = supabasePublicKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(i18n.t("errors.missingSupabaseEnv"));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: serviceFetch },
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: !isDemoDocument,
    autoRefreshToken: !isDemoDocument,
    ...(isDemoDocument ? { storageKey: "chronosync-demo-session" } : {}),
  },
});
