import React, { useEffect, useRef, useState } from "react";
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
  const [selectedClientCodes, setSelectedClientCodes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const { data: clients = [], isLoading, isError } = useQuery<Client[]>({
    queryKey: ["activeClients", companyId],
    queryFn: () => fetchActiveClients(companyId),
    enabled: open && Boolean(companyId),
  });

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setSelectedClientCodes([]);
      setSubmitError(null);
      setIsGenerating(false);
      return;
    }

    if (!initializedRef.current && clients.length > 0) {
      setSelectedClientCodes(clients.map((client) => client.client_code));
      initializedRef.current = true;
    }
  }, [open, clients]);

  const toggleClient = (clientCode: string) => {
    setSubmitError(null);
    setSelectedClientCodes((current) =>
      current.includes(clientCode)
        ? current.filter((code) => code !== clientCode)
        : [...current, clientCode],
    );
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
      });
      onClose();
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
      onClose={onClose}
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
          <div className="overflow-hidden rounded-2xl border border-border-strong bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-bg-accent text-xs font-semibold uppercase tracking-wide text-text">
                  <tr>
                    <th className="px-5 py-4">{t("dashboard.clientCode")}</th>
                    <th className="px-5 py-4">{t("dashboard.clientName")}</th>
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
                      <tr key={client.id} className="transition hover:bg-bg-accent/50">
                        <td className="px-5 py-4 font-medium text-text">
                          {client.client_code}
                        </td>
                        <td className="px-5 py-4 text-muted">{client.name}</td>
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
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
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
