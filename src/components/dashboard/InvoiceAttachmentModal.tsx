import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchActiveClients } from "../../services/clientProjectService";
import type { Client } from "../../types/client-project";
import { downloadSzamlamellekletReport } from "../../utils/downloadExcelReport";
import { Button } from "../shared/Button";
import { Modal } from "../shared/Modal";

interface InvoiceAttachmentModalProps {
  open: boolean;
  companyId: string;
  startDate: string;
  endDate: string;
  language: string;
  onClose: () => void;
}

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
  const [manualSelectedClientCodes, setManualSelectedClientCodes] = useState<
    string[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: clients = [],
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["activeClients", companyId],
    queryFn: () => fetchActiveClients(companyId),
    enabled: open && Boolean(companyId),
  });

  const selectedClientCodes = useMemo(() => {
    if (selectionMode === "all") {
      return clients.map((client) => client.client_code);
    }

    if (selectionMode === "defaults") {
      return clients
        .filter((client) => client.is_default)
        .map((client) => client.client_code);
    }

    return manualSelectedClientCodes;
  }, [clients, manualSelectedClientCodes, selectionMode]);

  const selectedClients = useMemo(
    () =>
      clients.filter((client) =>
        selectedClientCodes.includes(client.client_code),
      ),
    [clients, selectedClientCodes],
  );

  const periodLocale = useMemo(() => {
    const selectedLanguage = selectedClients[0]?.invoice_attachment_language;

    return selectedLanguage === "hu" ? "hu-HU" : "en-US";
  }, [selectedClients]);

  const periodText = useMemo(() => {
    const date = new Date(startDate);
    const year = new Intl.DateTimeFormat(periodLocale, {
      year: "numeric",
    }).format(date);
    const month = new Intl.DateTimeFormat(periodLocale, {
      month: "long",
    }).format(date);

    return `${year} ${month}`;
  }, [periodLocale, startDate]);

  const handleClose = () => {
    setSelectionMode("defaults");
    setManualSelectedClientCodes([]);
    setSubmitError(null);
    setIsGenerating(false);
    onClose();
  };

  const toggleClient = (clientCode: string) => {
    setSubmitError(null);
    setSelectionMode("manual");
    setManualSelectedClientCodes((current) =>
      (selectionMode === "manual" ? current : selectedClientCodes).includes(
        clientCode,
      )
        ? (selectionMode === "manual" ? current : selectedClientCodes).filter(
            (code) => code !== clientCode,
          )
        : [
            ...(selectionMode === "manual" ? current : selectedClientCodes),
            clientCode,
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
    setManualSelectedClientCodes([]);
  };

  const useDefaultCompanies = () => {
    setSubmitError(null);
    setSelectionMode("defaults");
  };

  const handleGenerate = async () => {
    if (selectedClientCodes.length === 0 || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setSubmitError(null);

    try {
      await downloadSzamlamellekletReport({
        clientCodes: selectedClientCodes,
        startDate,
        endDate,
        language,
        periodText,
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

  const hasSelection = selectedClientCodes.length > 0;

  return (
    <Modal
      open={open}
      title={t("dashboard.invoiceAttachmentModalTitle")}
      onClose={handleClose}
      className="max-w-4xl"
    >
      <div className="p-6 space-y-5">
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
          <div className="overflow-hidden rounded-3xl border border-border-strong bg-surface shadow-sm">
            <div className="border-b border-border-strong bg-bg-accent/80 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
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
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-strong">
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentSelectedCount", {
                    count: selectedClientCodes.length,
                  })}
                </span>
                <span className="rounded-full border border-border-strong bg-bg px-3 py-1">
                  {t("dashboard.invoiceAttachmentClientCount", {
                    count: clients.length,
                  })}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
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
                    const isChecked = selectedClientCodes.includes(
                      client.client_code,
                    );

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
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleClient(client.client_code)}
                            className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
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

        {submitError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
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
            disabled={!hasSelection || isGenerating || clients.length === 0}
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
