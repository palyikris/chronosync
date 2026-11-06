import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import "../../src/index.css";
import i18n from "../../src/lib/i18n";
import { AuthContext } from "../../src/context/authContextBase";
import { supabase } from "../../src/lib/supabaseClient";
import { ClientBillingPage } from "../../src/pages/ClientBillingPage";

if (!i18n.isInitialized) await new Promise(resolve => i18n.on("initialized", resolve));
await i18n.changeLanguage(new URLSearchParams(location.search).get("lang") ?? "en");
supabase.auth.getSession = async () => ({ data: { session: { access_token: "partner-import-ui-test" } as Session }, error: null });
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={{
    user: null, session: null, profile: { id: "10000000-0000-4000-8000-000000000001", company_id: "20000000-0000-4000-8000-000000000001",
      email: "admin@example.invalid", full_name: "Test admin", role: "company_admin", is_active: true, weekly_work_hours: 40,
      show_timesheet_timer: false, created_at: "2026-11-06T00:00:00Z" }, loading: false, isSuperAdmin: false, isCompanyAdmin: true,
    signOut: async () => undefined, refreshProfile: async () => undefined,
  }}><main className="p-3 sm:p-6"><ClientBillingPage /></main></AuthContext.Provider></MemoryRouter></QueryClientProvider>,
);
