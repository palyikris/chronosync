import React from "react";
import { useTranslation } from "react-i18next";

export const UserSettingsHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="pb-1">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">{t("userSettings.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {t("userSettings.subtitle")}
      </p>
    </div>
  );
};
