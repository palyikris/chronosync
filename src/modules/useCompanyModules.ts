import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";
import { isModuleEnabled, type ModuleId } from "./catalog";

export function useCompanyModules() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const query = useQuery({
    queryKey: ["company-modules", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies")
        .select("enabled_modules").eq("id", companyId!).single();
      if (error) throw error;
      return data.enabled_modules as ModuleId[];
    },
    enabled: Boolean(companyId),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    refetchInterval: 60_000,
  });

  return {
    ...query,
    hasModule: (module: ModuleId) => Boolean(companyId) && query.isSuccess && isModuleEnabled(query.data, module),
  };
}
