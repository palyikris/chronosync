import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "../../src/index.css";
import "../../src/lib/i18n";
import { InvoiceAttachmentsPage } from "../../src/pages/InvoiceAttachmentsPage";
import { AuthContext } from "../../src/context/authContextBase";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export function Harness() {
  return <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={{ user: null, session: null, loading: false,
      profile: { id: "00000000-0000-4000-8000-000000000001", company_id: "00000000-0000-4000-8000-000000000001",
        email: "synthetic@example.invalid", full_name: "Synthetic admin", role: "company_admin", is_active: true,
        weekly_work_hours: 40, show_timesheet_timer: false, created_at: "2026-10-01T00:00:00Z" },
      isSuperAdmin: false, isCompanyAdmin: true, refreshProfile: async () => {}, signOut: async () => {} }}>
      <MemoryRouter initialEntries={["/admin/invoice-attachments?startDate=2026-10-01&endDate=2026-10-31"]}>
        <InvoiceAttachmentsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
