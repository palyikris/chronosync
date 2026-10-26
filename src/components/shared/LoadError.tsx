import { useTranslation } from "react-i18next";
import { Button } from "./Button";

export function LoadError({ onRetry, retrying = false }: { onRetry: () => void; retrying?: boolean }) {
  const { t } = useTranslation();
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
    <span>{t("common.loadError")}</span>
    <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>{t("common.retry")}</Button>
  </div>;
}
