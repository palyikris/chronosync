import { useTranslation } from "react-i18next";

export function PageLoading() {
  const { t } = useTranslation();
  return <div role="status" className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted">
    <div aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary-strong" />
    {t("common.loading")}
  </div>;
}
