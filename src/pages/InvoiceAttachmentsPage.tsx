import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleHelp, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DatePicker } from "../components/shared/DatePicker";
import { Button } from "../components/shared/Button";
import { Checkbox } from "../components/shared/Checkbox";
import { useAuth } from "../context/useAuth";
import { fetchActiveClients } from "../services/clientProjectService";
import type { Client } from "../types/client-project";
import { downloadSzamlamellekletReport } from "../utils/downloadExcelReport";
import {
  getCurrentMonthDateRange,
  isValidDashboardDateRange,
  parseDashboardDate,
} from "../utils/dashboardCalculations";

interface DashboardDateRange {
  startDate: string;
  endDate: string;
}

type ClientDefaultFilter = "all" | "default" | "non_default";
type ClientSelectionFilter = "all" | "selected" | "unselected";
type ClientLanguageFilter = "all" | "en" | "hu" | "unset";

const MAX_INVOICE_ATTACHMENT_CLIENTS = 100;

const getInitialDateRange = (searchParams: URLSearchParams): DashboardDateRange => {
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (isValidDashboardDateRange(startDate, endDate)) {
    return { startDate, endDate };
  }

  return getCurrentMonthDateRange();
};

export const InvoiceAttachmentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const language = i18n.resolvedLanguage || i18n.language || "en";

  const [dateRange, setDateRange] = useState<DashboardDateRange>(() =>
    getInitialDateRange(searchParams),
  );
  const [selectionMode, setSelectionMode] = useState<"defaults" | "all" | "manual">("defaults");
  const [manualSelectedClientIds, setManualSelectedClientIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updateRemainingHours, setUpdateRemainingHours] = useState(false);
  const [isRemainingHoursInfoOpen, setIsRemainingHoursInfoOpen] = useState(false);
  const [areTableFiltersVisible, setAreTableFiltersVisible] = useState(true);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientDefaultFilter, setClientDefaultFilter] = useState<ClientDefaultFilter>("all");
  const [clientSelectionFilter, setClientSelectionFilter] = useState<ClientSelectionFilter>("all");
  const [clientLanguageFilter, setClientLanguageFilter] = useState<ClientLanguageFilter>("all");

  const { startDate, endDate } = dateRange;
  const isDateRangeValid = isValidDashboardDateRange(startDate, endDate);

  const {
    data: clients = [],
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["activeClients", companyId],
    queryFn: () => fetchActiveClients(companyId),
    enabled: Boolean(companyId),
  });

  const selectedClientIds = useMemo(() => {
    if (selectionMode === "all") {
      return clients.map((client) => client.id);
    }

    if (selectionMode === "defaults") {
      return clients.filter((client) => client.is_default).map((client) => client.id);
    }

    return manualSelectedClientIds;
  }, [clients, manualSelectedClientIds, selectionMode]);

  const selectedClients = useMemo(
    () => clients.filter((client) => selectedClientIds.includes(client.id)),
    [clients, selectedClientIds],
  );

  const canUpdateRemainingHours = useMemo(() => {
    const parsedStartDate = parseDashboardDate(startDate);
    const parsedEndDate = parseDashboardDate(endDate);
    if (!parsedStartDate || !parsedEndDate) return false;

    const lastDayOfMonth = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth() + 1,
      0,
      12,
    );

    return (
      parsedStartDate.getDate() === 1 &&
      parsedEndDate.getTime() === lastDayOfMonth.getTime()
    );
  }, [endDate, startDate]);

  const periodLocale = useMemo(() => {
    const selectedLanguage = selectedClients[0]?.invoice_attachment_language;
    return selectedLanguage === "hu" ? "hu-HU" : "en-US";
  }, [selectedClients]);

  const periodText = useMemo(() => {
    const parsedStartDate = parseDashboardDate(startDate);
    const parsedEndDate = parseDashboardDate(endDate);
    if (!parsedStartDate || !parsedEndDate) return "";

    const isSingleMonth =
      parsedStartDate.getFullYear() === parsedEndDate.getFullYear() &&
      parsedStartDate.getMonth() === parsedEndDate.getMonth();

    if (!isSingleMonth) {
      const rangeFormatter = new Intl.DateTimeFormat(periodLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return `${rangeFormatter.format(parsedStartDate)} - ${rangeFormatter.format(parsedEndDate)}`;
    }

    const year = new Intl.DateTimeFormat(periodLocale, {
      year: "numeric",
    }).format(parsedStartDate);
    const month = new Intl.DateTimeFormat(periodLocale, {
      month: "long",
    }).format(parsedStartDate);

    return `${year} ${month}`;
  }, [endDate, periodLocale, startDate]);

  const toggleClient = (clientId: string) => {
    setSubmitError(null);
    setSelectionMode("manual");
    setManualSelectedClientIds((current) =>
      (selectionMode === "manual" ? current : selectedClientIds).includes(clientId)
        ? (selectionMode === "manual" ? current : selectedClientIds).filter(
            (id) => id !== clientId,
          )
        : [...(selectionMode === "manual" ? current : selectedClientIds), clientId],
    );
  };

  const selectAllClients = () => {
    setSubmitError(null);
    setSelectionMode("all");
  };

  const unselectAllClients = () => {
    setSubmitError(null);
    setSelectionMode("manual");
    setManualSelectedClientIds([]);
  };

  const useDefaultCompanies = () => {
    setSubmitError(null);
    setSelectionMode("defaults");
  };

  const handleGenerate = async () => {
    if (!isDateRangeValid || selectedClientIds.length === 0 || isGenerating) {
      return;
    }

    if (selectedClientIds.length > MAX_INVOICE_ATTACHMENT_CLIENTS) {
      setSubmitError(
        t("dashboard.invoiceAttachmentTooManyClients", {
          max: MAX_INVOICE_ATTACHMENT_CLIENTS,
        }),
      );
      return;
    }

    setIsGenerating(true);
    setSubmitError(null);

    try {
      await downloadSzamlamellekletReport({
        companyId,
        clientIds: selectedClientIds,
        startDate,
        endDate,
        language,
        periodText,
        updateRemainingHours: updateRemainingHours && canUpdateRemainingHours,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t("dashboard.invoiceAttachmentGenerationFailed"),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const hasSelection = selectedClientIds.length > 0;
  const hasTooManySelectedClients = selectedClientIds.length > MAX_INVOICE_ATTACHMENT_CLIENTS;
  const selectedClientIdsSet = useMemo(
    () => new Set(selectedClientIds),
    [selectedClientIds],
  );

  const filteredClients = useMemo(() => {
    const normalizedSearchTerm = clientSearchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      if (normalizedSearchTerm) {
        const clientName = client.name.toLowerCase();
        const clientCode = client.client_code.toLowerCase();
        if (!clientName.includes(normalizedSearchTerm) && !clientCode.includes(normalizedSearchTerm)) {
          return false;
        }
      }

      if (clientDefaultFilter === "default" && !client.is_default) return false;
      if (clientDefaultFilter === "non_default" && client.is_default) return false;

      const isSelected = selectedClientIdsSet.has(client.id);
      if (clientSelectionFilter === "selected" && !isSelected) return false;
      if (clientSelectionFilter === "unselected" && isSelected) return false;

      if (clientLanguageFilter === "en" && client.invoice_attachment_language !== "en") {
        return false;
      }
      if (clientLanguageFilter === "hu" && client.invoice_attachment_language !== "hu") {
        return false;
      }
      if (clientLanguageFilter === "unset" && client.invoice_attachment_language !== null) {
        return false;
      }

      return true;
    });
  }, [
    clientDefaultFilter,
    clientLanguageFilter,
    clientSearchTerm,
    clientSelectionFilter,
    clients,
    selectedClientIdsSet,
  ]);

  const resetClientFilters = () => {
    setClientSearchTerm("");
    setClientDefaultFilter("all");
    setClientSelectionFilter("all");
    setClientLanguageFilter("all");
  };

  if (!companyId) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800"
      >
        {t("dashboard.companyRequired")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
        {t("navigation.invoiceAttachments")}
      </h1>
      <section className="rounded-3xl border border-border-strong bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-text">
            {t("dashboard.invoiceAttachmentDateRangeTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("dashboard.invoiceAttachmentDateRangeHint")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DatePicker
            value={startDate}
            max={endDate || undefined}
            invalid={!isDateRangeValid}
            ariaLabel={t("dashboard.startDateLabel")}
            label={t("dashboard.startDateLabel")}
            onChange={(value) => setDateRange((current) => ({ ...current, startDate: value }))}
            className="w-full"
            buttonClassName="bg-white"
          />
          <DatePicker
            value={endDate}
            min={startDate || undefined}
            invalid={!isDateRangeValid}
            ariaLabel={t("dashboard.endDateLabel")}
            label={t("dashboard.endDateLabel")}
            onChange={(value) => setDateRange((current) => ({ ...current, endDate: value }))}
            className="w-full"
            buttonClassName="bg-white"
          />
        </div>
        {!isDateRangeValid ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("dashboard.invalidDateRange")}
          </div>
        ) : null}
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-border-strong bg-bg-accent/60 px-4 py-8 text-center text-sm text-muted">
          {t("common.loading")}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {t("dashboard.invoiceAttachmentLoadFailed")}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-border-strong bg-bg-accent/60 px-4 py-8 text-center text-sm text-muted">
          {t("dashboard.invoiceAttachmentNoActiveClients")}
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-strong bg-surface shadow-sm">
          <div className="relative overflow-hidden border-b border-border-strong bg-white px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:px-5 sm:py-6">
            <div
              className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full border border-primary-strong/10 bg-primary/15"
              aria-hidden="true"
            />
            <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">
                  {t("dashboard.invoiceAttachmentSelectionTitle")}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t("dashboard.invoiceAttachmentDefaultCompaniesHint")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={selectAllClients}
                  className="justify-center whitespace-nowrap"
                >
                  {t("dashboard.selectAllCompanies")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={unselectAllClients}
                  disabled={!hasSelection}
                  className="justify-center whitespace-nowrap"
                >
                  {t("dashboard.unselectAllCompanies")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={useDefaultCompanies}
                  disabled={clients.every((client) => !client.is_default)}
                  className="justify-center whitespace-nowrap"
                >
                  {t("dashboard.useDefaultCompanies")}
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-border-strong pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <label className="flex items-center gap-3 text-sm text-text">
                  <Checkbox
                    checked={canUpdateRemainingHours && updateRemainingHours}
                    onChange={(event) => setUpdateRemainingHours(event.target.checked)}
                    disabled={!canUpdateRemainingHours}
                    className="h-4 w-4"
                  />
                  <span className="inline-flex items-center gap-2">
                    <span className="font-medium">
                      {t("dashboard.invoiceAttachmentUpdateRemainingHoursLabel")}
                    </span>
                    <button
                      type="button"
                      aria-label={t("dashboard.invoiceAttachmentUpdateInfoLabel")}
                      aria-expanded={isRemainingHoursInfoOpen}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsRemainingHoursInfoOpen((open) => !open);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-white text-muted-strong transition hover:text-text"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </label>
                {isRemainingHoursInfoOpen ? (
                  <div
                    role="tooltip"
                    className="absolute left-12 top-[calc(100%+0.45rem)] z-20 w-[min(24rem,calc(100vw-4rem))] rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-muted shadow-[0_10px_24px_rgba(39,45,28,0.16)]"
                  >
                    {canUpdateRemainingHours
                      ? t("dashboard.invoiceAttachmentUpdateRemainingHoursHint")
                      : t("dashboard.invoiceAttachmentUpdateRequiresFullMonth")}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-strong lg:justify-end">
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentSelectedCount", {
                    count: selectedClientIds.length,
                  })}
                </span>
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentClientCountFiltered", {
                    filtered: filteredClients.length,
                    total: clients.length,
                  })}
                </span>
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {periodText}
                </span>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="sticky top-0 z-10 border-b border-border-strong bg-surface/95 px-4 py-3 backdrop-blur sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text">
                  {t("dashboard.invoiceAttachmentFilterBarTitle")}
                </p>
                <div className="flex items-center gap-2">
                  {areTableFiltersVisible ? (
                    <button
                      type="button"
                      onClick={resetClientFilters}
                      className="h-9 rounded-xl border border-border-strong bg-white px-3 text-sm font-medium text-text transition hover:bg-bg-accent"
                    >
                      {t("dashboard.invoiceAttachmentResetFilters")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAreTableFiltersVisible((visible) => !visible)}
                    aria-expanded={areTableFiltersVisible}
                    className="h-9 rounded-xl border border-border-strong bg-white px-3 text-sm font-medium text-text transition hover:bg-bg-accent"
                  >
                    {areTableFiltersVisible ? t("common.hide") : t("common.show")}
                  </button>
                </div>
              </div>

              {areTableFiltersVisible ? (
                <div className="mt-3 overflow-x-auto pb-1">
                  <div className="flex min-w-[980px] items-end gap-2">
                    <label className="block min-w-[20rem] flex-[1.2]">
                      <span className="block text-[11px] font-medium text-muted-strong">
                        {t("dashboard.invoiceAttachmentSearchFieldLabel")}
                      </span>
                      <input
                        type="search"
                        value={clientSearchTerm}
                        onChange={(event) => setClientSearchTerm(event.target.value)}
                        placeholder={t("dashboard.invoiceAttachmentSearchPlaceholder")}
                        className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>

                    <label className="block min-w-[12rem] flex-1">
                      <span className="block text-[11px] font-medium text-muted-strong">
                        {t("dashboard.invoiceAttachmentDefaultFilterLabel")}
                      </span>
                      <select
                        value={clientDefaultFilter}
                        onChange={(event) =>
                          setClientDefaultFilter(event.target.value as ClientDefaultFilter)
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">{t("dashboard.invoiceAttachmentDefaultFilterAll")}</option>
                        <option value="default">{t("dashboard.invoiceAttachmentDefaultFilterDefault")}</option>
                        <option value="non_default">{t("dashboard.invoiceAttachmentDefaultFilterNonDefault")}</option>
                      </select>
                    </label>

                    <label className="block min-w-[12rem] flex-1">
                      <span className="block text-[11px] font-medium text-muted-strong">
                        {t("dashboard.invoiceAttachmentSelectionFilterLabel")}
                      </span>
                      <select
                        value={clientSelectionFilter}
                        onChange={(event) =>
                          setClientSelectionFilter(event.target.value as ClientSelectionFilter)
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">{t("dashboard.invoiceAttachmentSelectionFilterAll")}</option>
                        <option value="selected">{t("dashboard.invoiceAttachmentSelectionFilterSelected")}</option>
                        <option value="unselected">{t("dashboard.invoiceAttachmentSelectionFilterUnselected")}</option>
                      </select>
                    </label>

                    <label className="block min-w-[12rem] flex-1">
                      <span className="block text-[11px] font-medium text-muted-strong">
                        {t("dashboard.invoiceAttachmentLanguageFilterLabel")}
                      </span>
                      <select
                        value={clientLanguageFilter}
                        onChange={(event) =>
                          setClientLanguageFilter(event.target.value as ClientLanguageFilter)
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">{t("dashboard.invoiceAttachmentLanguageFilterAll")}</option>
                        <option value="en">{t("companySettings.invoiceAttachmentLanguageEn")}</option>
                        <option value="hu">{t("companySettings.invoiceAttachmentLanguageHu")}</option>
                        <option value="unset">{t("dashboard.invoiceAttachmentLanguageFilterUnset")}</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead className="bg-surface text-xs font-semibold uppercase tracking-wide text-muted-strong">
                <tr>
                  <th className="px-5 py-4">{t("dashboard.clientCode")}</th>
                  <th className="px-5 py-4">{t("dashboard.clientName")}</th>
                  <th className="px-5 py-4 text-center">{t("dashboard.defaultClientBadge")}</th>
                  <th className="px-5 py-4 text-center">{t("dashboard.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-strong text-sm">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted">
                      {t("dashboard.invoiceAttachmentNoMatchingClients")}
                    </td>
                  </tr>
                ) : null}
                {filteredClients.map((client) => {
                  const isChecked = selectedClientIdsSet.has(client.id);

                  return (
                    <tr key={client.id} className="transition hover:bg-bg-accent/50">
                      <td className="px-5 py-4 font-medium text-text">{client.client_code}</td>
                      <td className="px-5 py-4 text-muted">{client.name}</td>
                      <td className="px-5 py-4 text-center">
                        {client.is_default ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong">
                            {t("dashboard.defaultClientBadge")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-bg-accent px-3 py-1 text-xs font-medium text-muted-strong">
                            {t("dashboard.notDefaultClientBadge")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleClient(client.id)}
                          className="h-4 w-4"
                          aria-label={t("dashboard.selectClientForInvoice", {
                            clientName: client.name,
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {submitError || hasTooManySelectedClients ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError ??
            t("dashboard.invoiceAttachmentTooManyClients", {
              max: MAX_INVOICE_ATTACHMENT_CLIENTS,
            })}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border-strong bg-surface/95 p-3 shadow-[0_8px_22px_rgba(75,87,57,0.09)] backdrop-blur">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          disabled={isGenerating}
        >
          {t("dashboard.invoiceAttachmentBackToDashboard")}
        </Button>
        <Button
          icon={<Download className="h-4 w-4" />}
          onClick={handleGenerate}
          disabled={
            !isDateRangeValid ||
            !hasSelection ||
            hasTooManySelectedClients ||
            isGenerating ||
            clients.length === 0
          }
        >
          {isGenerating ? t("common.loading") : t("dashboard.generateInvoiceAttachments")}
        </Button>
      </div>
    </div>
  );
};
