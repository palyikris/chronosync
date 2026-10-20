import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../shared/Tooltip";
import type { Company } from "../../types/company";

interface CompanyTableProps {
  loading: boolean;
  filteredCompanies: Company[];
  onToggleActive: (company: Company) => void;
  onEdit: (company: Company) => void;
  onSoftDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onHardDelete: (id: string) => void;
}

export const CompanyTable: React.FC<CompanyTableProps> = ({
  loading,
  filteredCompanies,
  onToggleActive,
  onEdit,
  onSoftDelete,
  onRestore,
  onHardDelete,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-strong/84 shadow-card backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-border bg-bg-accent/45 text-[11px] font-medium text-muted-strong">
              <tr>
                <th className="px-4 py-3">{t("companyManagement.company")}</th>
                <th className="px-4 py-3">{t("companyManagement.users")}</th>
                <th className="px-4 py-3">
                  {t("companyManagement.billingContact")}
                </th>
                <th className="px-4 py-3">{t("companyManagement.status")}</th>
                <th className="px-4 py-3 text-center">
                  {t("companyManagement.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  {t("companyManagement.loadingCompanies")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-strong/84 shadow-card backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-border bg-bg-accent/45 text-[11px] font-medium text-muted-strong">
            <tr>
              <th className="px-4 py-3">{t("companyManagement.company")}</th>
              <th className="px-4 py-3">{t("companyManagement.users")}</th>
              <th className="px-4 py-3">
                {t("companyManagement.billingContact")}
              </th>
              <th className="px-4 py-3">{t("companyManagement.status")}</th>
              <th className="px-4 py-3 text-center">
                {t("companyManagement.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  {t("companyManagement.noCompanies")}
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => {
                const isDeleted = company.is_deleted;

                return (
                  <tr
                    key={company.id}
                    className={`transition ${isDeleted ? "bg-bg opacity-50" : "hover:bg-bg-accent"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/35 text-[11px] font-semibold text-text shadow-[inset_0_0_0_1px_rgba(75,87,57,0.07)]">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-text ${isDeleted ? "line-through" : ""}`}
                          >
                            {company.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {t("companyManagement.created")}{" "}
                            {new Date(company.created_at).toLocaleDateString(
                              "hu-HU",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[13px] text-muted">
                      {company.user_count ?? 0}
                    </td>

                    <td className="px-4 py-3 text-[13px] text-muted">
                      {company.billing_email || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {isDeleted ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                          {t("companyManagement.deleted")}
                        </span>
                      ) : company.is_active ? (
                        <span className="rounded-full bg-primary/18 px-2.5 py-1 text-[11px] font-medium text-primary-strong">
                          {t("companyManagement.active")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                          {t("companyManagement.disabled")}
                        </span>
                      )}
                    </td>

                    <td className="relative px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-2 text-muted">
                        {!isDeleted ? (
                          <>
                            <Tooltip
                              content={
                                company.is_active
                                  ? t("companyManagement.disableTenant")
                                  : t("companyManagement.enableTenant")
                              }
                            >
                              <button
                                type="button"
                                onClick={() => onToggleActive(company)}
                                className={`p-1.5 rounded-full transition ${
                                  company.is_active
                                    ? "hover:bg-red-50 text-red-600"
                                    : "hover:bg-green-50 text-green-600"
                                }`}
                              >
                                {company.is_active ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            </Tooltip>
                            <Tooltip
                              content={t("companyManagement.editCompany")}
                            >
                              <button
                                type="button"
                                onClick={() => onEdit(company)}
                                className="p-1.5 rounded-full transition hover:bg-gray-100"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip
                              content={t("companyManagement.softDelete")}
                            >
                              <button
                                type="button"
                                onClick={() => onSoftDelete(company.id)}
                                className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip
                              content={t("companyManagement.restoreCompany")}
                            >
                              <button
                                type="button"
                                onClick={() => onRestore(company.id)}
                                className="p-1.5 rounded-full transition hover:bg-green-50 text-green-600"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip
                              content={t(
                                "companyManagement.hardDeletePermanently",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => onHardDelete(company.id)}
                                className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-bg-accent/40 px-4 py-3 text-[11px] text-muted">
        <span>
          {t("companyManagement.showingCount", {
            count: filteredCompanies.length,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 border border-border-strong rounded-lg text-gray-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-lg"
          >
            1
          </button>
          <button
            type="button"
            className="p-1.5 border border-border-strong rounded-lg hover:bg-gray-200 text-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
