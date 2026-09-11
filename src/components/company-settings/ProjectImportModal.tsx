import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  parseAndImportProjectsExcel,
  type BulkImportResult,
} from "../../utils/excelProjectImporter";
import { Modal } from "../shared/Modal";
import { Button } from "../shared/Button";

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onImportComplete: () => void;
}

export const ProjectImportModal: React.FC<ProjectImportModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onImportComplete,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handleReset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const importResult = await parseAndImportProjectsExcel(file, companyId);
      setResult(importResult);
      onImportComplete();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("companySettings.projectImportFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={t("companySettings.projectImportTitle")}
      className="max-w-3xl p-4"
    >
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-700 p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="excel-file-input"
                accept=".xlsx, .xls"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
              />
              <label
                htmlFor="excel-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {file
                    ? file.name
                    : t("companySettings.projectImportChooseFile")}
                </span>
                <span className="text-xs text-gray-400">
                  {t("companySettings.projectImportHeaderHint")}
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("companySettings.projectImportImporting")}
                  </>
                ) : (
                  t("companySettings.projectImportStart")
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* KPI Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {result.createdCount}
                </div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                    {t("common.created")}
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-lg text-center">
                <div className="text-xl font-bold text-amber-700 ">
                  {result.skippedCount}
                </div>
                <div className="text-xs font-medium text-amber-600 ">
                    {t("companySettings.projectImportSkipped")}
                </div>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-xl font-bold text-red-700 dark:text-red-300">
                  {result.failedCount}
                </div>
                <div className="text-xs font-medium text-red-600 dark:text-red-400">
                    {t("companySettings.projectImportFailedCount")}
                </div>
              </div>
            </div>

            {/* Row Outcome Breakdown */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-zinc-700 rounded-lg text-xs divide-y divide-gray-100 dark:divide-zinc-800">
              {result.outcomes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    {item.status === "created" && (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    )}
                    {item.status === "skipped" && (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    {item.status === "failed" && (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="text-gray-500 font-mono">
                        {t("companySettings.projectImportRowLabel")} {item.rowNumber}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      [{item.clientCode}]
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.projectName}
                    </span>
                  </div>
                  {item.reason && (
                    <span className="text-gray-400 italic text-[11px] shrink-0">
                      {item.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleClose}>
                  {t("companySettings.projectImportDone")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
