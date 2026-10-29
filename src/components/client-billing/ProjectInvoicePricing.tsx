import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchProjects } from "../../services/clientProjectService";
import { fetchProjectPricing } from "../../services/projectPricingService";
import { Input } from "../shared/Input";
import { LoadError } from "../shared/LoadError";
import { PageLoading } from "../shared/PageLoading";

interface Props {
  companyId: string;
  clientId: string;
  year: number;
  quantities: Record<string, string>;
  onQuantityChange: (projectId: string, value: string) => void;
}

export function ProjectInvoicePricing({ companyId, clientId, year, quantities, onQuantityChange }: Props) {
  const { t, i18n } = useTranslation();
  const projects = useQuery({ queryKey: ["invoice-projects", companyId, clientId],
    queryFn: () => fetchProjects(companyId, clientId), enabled: Boolean(companyId && clientId) });
  const prices = useQuery({ queryKey: ["project-pricing", companyId, year],
    queryFn: () => fetchProjectPricing(companyId, year), enabled: Boolean(companyId && year),
    staleTime: 0, refetchOnWindowFocus: true });
  const priceById = new Map((prices.data ?? []).map(price => [price.project_id, price]));
  const format = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, { maximumFractionDigits: 4 });
  if (projects.isLoading || prices.isLoading) return <PageLoading />;
  if (projects.isError || prices.isError) return <LoadError
    retrying={projects.isFetching || prices.isFetching} onRetry={() => { void projects.refetch(); void prices.refetch(); }} />;
  return <section className="space-y-3" aria-label={t("clientBilling.projectPricingTitle")}>
    <p className="text-xs leading-5 text-muted">{t("clientBilling.projectPricingHint")}</p>
    <Link to="/admin/settings" className="inline-block text-xs font-semibold text-primary-strong underline">{t("clientBilling.manageProjectPrices")}</Link>
    <div className="max-h-80 space-y-2 overflow-auto">
      {(projects.data ?? []).filter(project => project.is_active).map(project => {
        const price = priceById.get(project.id);
        const missing = price?.indexed_fee == null;
        const hourly = ["óra", "hour", "hours", "h", "hr"].includes(price?.unit.trim().toLowerCase() ?? "");
        return <div key={project.id} className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_12rem] ${missing ? "border-warning-border bg-warning-bg" : "border-border"}`}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">{project.name}</p>
            <p className={`mt-1 text-xs ${missing ? "text-amber-900" : "text-muted"}`}>{missing
              ? t("projectPricing.missingBadge", { year })
              : `${format.format(price.indexed_fee!)} ${price.currency} · ${price.unit}`}</p>
          </div>
          {!missing && (hourly ? <p className="self-center text-xs text-muted">{t("clientBilling.quantityFromHours")}</p>
            : <Input type="number" min="0" max="999999" step="0.0001"
              aria-label={t("clientBilling.projectQuantityLabel", { project: project.name, unit: price.unit })}
              label={t("clientBilling.projectQuantity", { unit: price.unit })}
              value={quantities[project.id] ?? ""}
              onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
              onChange={event => onQuantityChange(project.id, event.target.value)} />)}
        </div>;
      })}
    </div>
  </section>;
}
