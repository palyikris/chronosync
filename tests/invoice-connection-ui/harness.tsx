import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "../../src/index.css";
import i18n from "../../src/lib/i18n";
import { supabase } from "../../src/lib/supabaseClient";
import { InvoiceSettingsCard } from "../../src/components/company-settings/InvoiceSettingsCard";

const params = new URLSearchParams(location.search);
void i18n.changeLanguage(params.get("lang") ?? "en");
// This isolated harness never authenticates against a live account.
supabase.auth.getSession = async () => ({
  data: { session: { access_token: "connection-test-token" } as Session },
  error: null,
});

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-2xl p-4">
    <InvoiceSettingsCard
      companyId="10000000-0000-4000-8000-000000000001"
      settings={{
        invoice_provider: params.get("provider") === "billingo" ? "billingo" : "szamlazz_hu",
        api_key_configured: params.get("configured") === "1",
      }}
    />
  </main>,
);
