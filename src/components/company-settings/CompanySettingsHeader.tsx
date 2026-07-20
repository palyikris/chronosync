import React from "react";

interface CompanySettingsHeaderProps {
  title: string;
  subtitle: string;
}

export const CompanySettingsHeader: React.FC<CompanySettingsHeaderProps> = ({ title, subtitle }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#191c1d]">{title}</h1>
      <p className="mt-1 text-sm text-[#5e5e62]">{subtitle}</p>
    </div>
  );
};