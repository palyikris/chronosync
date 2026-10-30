import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import i18n from "../../src/lib/i18n";
import { ProjectManagementCard } from "../../src/components/company-settings/ProjectManagementCard";
import { fetchProjects } from "../../src/services/clientProjectService";
import type { Client, Project } from "../../src/types/client-project";

void i18n.changeLanguage(new URLSearchParams(location.search).get("lang") ?? "en");
const companyId = "10000000-0000-4000-8000-000000000001";
const client: Client = { id: "20000000-0000-4000-8000-000000000001", company_id: companyId,
  name: "Test client", client_code: "TEST", is_active: true, is_default: false,
  invoice_attachment_language: "hu", available_hours_per_month: 100, hours_from_previous_month: 0 };
const initialProjects: Project[] = [null, 3].map((payroll_headcount, i) => ({
  id: `30000000-0000-4000-8000-00000000000${i + 1}`, company_id: companyId,
  client_id: client.id, name: i === 0 ? "Consulting" : "Payroll work",
  is_active: true, estimated_hours_per_month: 2.5, payroll_headcount, created_at: "2026-10-29T00:00:00Z",
}));

export function Harness() {
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState("");
  return <main className="mx-auto max-w-4xl p-4">
    {error && <p role="alert">{error}</p>}
    <ProjectManagementCard companyId={companyId} clients={[client]} projects={projects}
      onRefresh={() => { void fetchProjects(companyId).then(setProjects).catch(error => setError(String(error))); }} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
