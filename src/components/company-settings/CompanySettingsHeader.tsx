import React from "react";
import type { CompanySettingsHeaderProps } from "../../types/company-settings";

export const CompanySettingsHeader: React.FC<CompanySettingsHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="pb-1">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">{title}</h1>
      <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
    </div>
  );
};
