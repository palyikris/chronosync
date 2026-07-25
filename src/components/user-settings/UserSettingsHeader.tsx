import React from "react";
import { useTranslation } from "react-i18next";

export const UserSettingsHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">{t("userSettings.title")}</h1>
      <p className="mt-1 text-sm text-muted-strong">
        {t("userSettings.subtitle")}
      </p>
    </div>
  );
};