import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchActiveClients } from "../../services/clientProjectService";
import type { Client } from "../../types/client-project";
import { downloadSzamlamellekletReport } from "../../utils/downloadExcelReport";
import { parseDashboardDate } from "../../utils/dashboardCalculations";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Modal } from "../shared/Modal";

interface InvoiceAttachmentModalProps {
  open: boolean;
  companyId: string;
  startDate: string;
  endDate: string;
  language: string;
  onClose: () => void;
}

const MAX_INVOICE_ATTACHMENT_CLIENTS = 100;

export const InvoiceAttachmentModal: React.FC<InvoiceAttachmentModalProps> = ({
  open,
  companyId,
  startDate,
  endDate,
  language,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectionMode, setSelectionMode] = useState<
    "defaults" | "all" | "manual"
  >("defaults");
  const [manualSelectedClientIds, setManualSelectedClientIds] = useState<
    string[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updateRemainingHours, setUpdateRemainingHours] = useState(false);

  const {
    data: clients = [],
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["activeClients", companyId],
    queryFn: () => fetchActiveClients(companyId),
    enabled: open && Boolean(companyId),
  });

  const selectedClientIds = useMemo(() => {
    if (selectionMode === "all") {
      return clients.map((client) => client.id);
    }

    if (selectionMode === "defaults") {
      return clients
        .filter((client) => client.is_default)
        .map((client) => client.id);
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

      return `${rangeFormatter.format(parsedStartDate)} – ${rangeFormatter.format(parsedEndDate)}`;
    }

    const year = new Intl.DateTimeFormat(periodLocale, {
      year: "numeric",
    }).format(parsedStartDate);
    const month = new Intl.DateTimeFormat(periodLocale, {
      month: "long",
    }).format(parsedStartDate);

    return `${year} ${month}`;
  }, [endDate, periodLocale, startDate]);

  const handleClose = () => {
    setSelectionMode("defaults");
    setManualSelectedClientIds([]);
    setSubmitError(null);
    setIsGenerating(false);
    setUpdateRemainingHours(false);
    onClose();
  };

  const toggleClient = (clientId: string) => {
    setSubmitError(null);
    setSelectionMode("manual");
    setManualSelectedClientIds((current) =>
      (selectionMode === "manual" ? current : selectedClientIds).includes(
        clientId,
      )
        ? (selectionMode === "manual" ? current : selectedClientIds).filter(
            (id) => id !== clientId,
          )
        : [
            ...(selectionMode === "manual" ? current : selectedClientIds),
            clientId,
          ],
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
    if (selectedClientIds.length === 0 || isGenerating) {
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
      handleClose();
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
  const hasTooManySelectedClients =
    selectedClientIds.length > MAX_INVOICE_ATTACHMENT_CLIENTS;

  return (
    <Modal
      open={open}
      title={t("dashboard.invoiceAttachmentModalTitle")}
      onClose={handleClose}
      className="max-w-4xl"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-4 sm:p-6">
        <p className="text-sm text-muted">
          {t("dashboard.invoiceAttachmentModalSubtitle")}
        </p>

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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-strong bg-surface shadow-sm">
            <div className="relative overflow-hidden border-b border-border-strong bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:px-5">
              <div
                className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full border border-primary-strong/10 bg-primary/15"
                aria-hidden="true"
              />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    {t("dashboard.invoiceAttachmentSelectionTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("dashboard.invoiceAttachmentDefaultCompaniesHint")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={selectAllClients}
                  >
                    {t("dashboard.selectAllCompanies")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={unselectAllClients}
                    disabled={!hasSelection}
                  >
                    {t("dashboard.unselectAllCompanies")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={useDefaultCompanies}
                    disabled={clients.every((client) => !client.is_default)}
                  >
                    {t("dashboard.useDefaultCompanies")}
                  </Button>
                </div>
              </div>
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-border-strong bg-surface px-4 py-3 text-sm text-text">
                <Checkbox
                  checked={canUpdateRemainingHours && updateRemainingHours}
                  onChange={(event) =>
                    setUpdateRemainingHours(event.target.checked)
                  }
                  disabled={!canUpdateRemainingHours}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium">
                    {t("dashboard.invoiceAttachmentUpdateRemainingHoursLabel")}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {canUpdateRemainingHours
                      ? t("dashboard.invoiceAttachmentUpdateRemainingHoursHint")
                      : t(
                          "dashboard.invoiceAttachmentUpdateRequiresFullMonth",
                        )}
                  </span>
                </span>
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-strong">
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentSelectedCount", {
                    count: selectedClientIds.length,
                  })}
                </span>
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentClientCount", {
                    count: clients.length,
                  })}
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[720px] w-full border-collapse text-left">
                <thead className="bg-surface text-xs font-semibold uppercase tracking-wide text-muted-strong">
                  <tr>
                    <th className="px-5 py-4">{t("dashboard.clientCode")}</th>
                    <th className="px-5 py-4">{t("dashboard.clientName")}</th>
                    <th className="px-5 py-4 text-center">
                      {t("dashboard.defaultClientBadge")}
                    </th>
                    <th className="px-5 py-4 text-center">
                      {t("dashboard.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-strong text-sm">
                  {clients.map((client) => {
                    const isChecked = selectedClientIds.includes(client.id);

                    return (
                      <tr
                        key={client.id}
                        className="transition hover:bg-bg-accent/50"
                      >
                        <td className="px-5 py-4 font-medium text-text">
                          {client.client_code}
                        </td>
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
          </div>
        )}

        {submitError || hasTooManySelectedClients ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError ??
              t("dashboard.invoiceAttachmentTooManyClients", {
                max: MAX_INVOICE_ATTACHMENT_CLIENTS,
              })}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border-strong pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={
              !hasSelection ||
              hasTooManySelectedClients ||
              isGenerating ||
              clients.length === 0
            }
          >
            {isGenerating
              ? t("common.loading")
              : t("dashboard.generateInvoiceAttachments")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
