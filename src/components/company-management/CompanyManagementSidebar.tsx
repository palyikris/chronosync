import React from "react";
import { useTranslation } from "react-i18next";

export const CompanyManagementSidebar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <aside className="bg-surface-container-low w-20 fixed left-0 top-16 bottom-0 flex flex-col items-center py-6 border-r border-outline z-30">
      <div className="p-2 rounded-full bg-primary-container text-on-primary-container">
        <span className="material-symbols-outlined">account_tree</span>
      </div>
      <span className="text-xs font-bold text-primary mt-1">
        {t("companyManagement.brand")}
      </span>
    </aside>
  );
};
