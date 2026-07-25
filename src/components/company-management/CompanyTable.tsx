import React from "react";
import { Check, ChevronLeft, ChevronRight, Edit3, Trash2, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
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
      <div className="bg-white rounded-2xl border border-border-strong shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f3f4f5] border-b border-border-strong text-xs font-semibold text-text">
              <tr>
                <th className="px-6 py-4">{t("companyManagement.company")}</th>
                <th className="px-6 py-4">{t("companyManagement.users")}</th>
                <th className="px-6 py-4">
                  {t("companyManagement.billingContact")}
                </th>
                <th className="px-6 py-4">{t("companyManagement.status")}</th>
                <th className="px-6 py-4 text-center">
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
    <div className="bg-white rounded-2xl border border-border-strong shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f3f4f5] border-b border-border-strong text-xs font-semibold text-text">
            <tr>
              <th className="px-6 py-4">{t("companyManagement.company")}</th>
              <th className="px-6 py-4">{t("companyManagement.users")}</th>
              <th className="px-6 py-4">
                {t("companyManagement.billingContact")}
              </th>
              <th className="px-6 py-4">{t("companyManagement.status")}</th>
              <th className="px-6 py-4 text-center">
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
                    className={`transition ${isDeleted ? "opacity-50 bg-gray-50" : "hover:bg-bg"}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-strong text-white flex items-center justify-center font-bold text-sm shrink-0">
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

                    <td className="px-6 py-4 text-sm text-muted">
                      {company.user_count ?? 0}
                    </td>

                    <td className="px-6 py-4 text-sm text-muted">
                      {company.billing_email || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {isDeleted ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          {t("companyManagement.deleted")}
                        </span>
                      ) : company.is_active ? (
                        <span className="px-3 py-1 bg-[#e8f5c2] text-primary-strong rounded-full text-xs font-bold uppercase tracking-wider">
                          {t("companyManagement.active")}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                          {t("companyManagement.disabled")}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 relative text-center">
                      <div className="flex justify-center items-center gap-2 text-muted">
                        {!isDeleted ? (
                          <>
                            <button
                              type="button"
                              title={
                                company.is_active
                                  ? t("companyManagement.disableTenant")
                                  : t("companyManagement.enableTenant")
                              }
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
                            <button
                              type="button"
                              title={t("companyManagement.editCompany")}
                              onClick={() => onEdit(company)}
                              className="p-1.5 rounded-full transition hover:bg-gray-100"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title={t("companyManagement.softDelete")}
                              onClick={() => onSoftDelete(company.id)}
                              className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              title={t("companyManagement.restoreCompany")}
                              onClick={() => onRestore(company.id)}
                              className="p-1.5 rounded-full transition hover:bg-green-50 text-green-600"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title={t(
                                "companyManagement.hardDeletePermanently",
                              )}
                              onClick={() => onHardDelete(company.id)}
                              className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      <div className="px-6 py-4 flex items-center justify-between bg-[#f3f4f5] border-t border-border-strong text-xs text-muted">
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
