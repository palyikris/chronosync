import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  parseAndImportClientsExcel,
  type ClientBulkImportResult,
} from "../../utils/excelClientImporter";
import { Modal } from "../shared/Modal";
import { Button } from "../shared/Button";

interface ClientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onImportComplete: () => void;
}

export const ClientImportModal: React.FC<ClientImportModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onImportComplete,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClientBulkImportResult | null>(null);

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setLoading(false);
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const importResult = await parseAndImportClientsExcel(file, companyId);
      setResult(importResult);
      onImportComplete();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t("companySettings.clientImportFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={t("companySettings.clientImportTitle")}
      className="max-w-3xl p-4"
    >
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary">
              <input
                type="file"
                id="client-excel-file-input"
                accept=".xlsx, .xls"
                className="hidden"
                disabled={loading}
                onChange={(event) => {
                  if (event.target.files?.[0]) setFile(event.target.files[0]);
                }}
              />
              <label
                htmlFor="client-excel-file-input"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {file
                    ? file.name
                    : t("companySettings.clientImportChooseFile")}
                </span>
                <span className="text-xs text-gray-400">
                  {t("companySettings.clientImportHeaderHint")}
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("companySettings.clientImportImporting")}
                  </>
                ) : (
                  t("companySettings.clientImportStart")
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <div className="text-xl font-bold text-green-700">
                  {result.createdCount}
                </div>
                <div className="text-xs font-medium text-green-600">
                  {t("common.created")}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <div className="text-xl font-bold text-amber-700">
                  {result.skippedCount}
                </div>
                <div className="text-xs font-medium text-amber-600">
                  {t("companySettings.clientImportSkipped")}
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-xl font-bold text-red-700">
                  {result.failedCount}
                </div>
                <div className="text-xs font-medium text-red-600">
                  {t("companySettings.clientImportFailedCount")}
                </div>
              </div>
            </div>

            <div className="max-h-60 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 text-xs">
              {result.outcomes.map((item) => (
                <div
                  key={item.rowNumber}
                  className="flex items-center justify-between gap-3 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    {item.status === "created" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    )}
                    {item.status === "skipped" && (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    {item.status === "failed" && (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span className="font-mono text-gray-500">
                      {t("companySettings.clientImportRowLabel")} {item.rowNumber}
                    </span>
                    <span className="font-semibold text-gray-800">
                      [{item.clientCode}]
                    </span>
                    <span className="text-gray-600">{item.clientName}</span>
                  </div>
                  {item.reason && (
                    <span className="shrink-0 text-[11px] italic text-gray-400">
                      {item.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleClose}>
                {t("companySettings.clientImportDone")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};