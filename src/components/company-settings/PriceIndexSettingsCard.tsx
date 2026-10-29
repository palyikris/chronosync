import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchCompanyPriceIndexes, saveCompanyPriceIndexes } from "../../services/projectPricingService";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { LoadError } from "../shared/LoadError";
import type { CompanyPriceIndex } from "../../types/project-pricing";

export function PriceIndexSettingsCard({ companyId, year }: { companyId: string; year: number }) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["price-indexes", companyId, year],
    queryFn: () => fetchCompanyPriceIndexes(companyId), enabled: Boolean(companyId) });
  return <Card>
    <CardHeader><CardTitle role="heading" aria-level={2}>{t("projectPricing.indexSettingsTitle", { year: year + 1 })}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted">{t("projectPricing.indexSettingsHint", { year: year + 1 })}</p>
      {query.isError ? <LoadError retrying={query.isFetching} onRetry={() => { void query.refetch(); }} />
        : query.isSuccess ? <IndexForm key={`${companyId}-${year}`}
          companyId={companyId} year={year + 1} indexes={query.data} />
        : <p className="text-sm text-muted">{t("common.loading")}</p>}
    </CardContent>
  </Card>;
}

function IndexForm({ companyId, year, indexes }: { companyId: string; year: number; indexes: CompanyPriceIndex[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initial = (code: "ksh" | "eu") => {
    const value = indexes.filter(row => row.index_code === code && row.effective_year <= year)
      .sort((a, b) => b.effective_year - a.effective_year)[0];
    return value ? String(Number((Number(value.rate) * 100).toFixed(4))) : "";
  };
  const [rates, setRates] = useState({ ksh: initial("ksh"), eu: initial("eu") });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      await saveCompanyPriceIndexes(companyId, year, rates);
      setMessage("saved");
      void queryClient.invalidateQueries({ queryKey: ["price-indexes", companyId] });
    } catch { setMessage("error"); }
    finally { setSaving(false); }
  }}>
    <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {(["ksh", "eu"] as const).map(code => <Input key={code} type="number" min="-100" max="1000" step="0.0001"
        required={initial(code) !== ""}
        label={t(`projectPricing.${code}Rate`)} value={rates[code]}
        onChange={event => { setRates({ ...rates, [code]: event.target.value }); setMessage(null); }} />)}
      <Button type="submit" disabled={rates.ksh.trim() === "" && rates.eu.trim() === ""}>
        {t(saving ? "common.saving" : "projectPricing.saveIndexes")}
      </Button>
    </fieldset>
    {message && <p role={message === "error" ? "alert" : "status"} className={`text-sm ${message === "error" ? "text-danger" : "text-muted"}`}>
      {t(message === "error" ? "projectPricing.saveError" : "projectPricing.indexesSaved", { year })}
    </p>}
  </form>;
}
