import React from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Select } from "../shared/Select";

interface Props {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  showSuccess: boolean;
}

export const LanguagePreferencesCard: React.FC<Props> = ({
  selectedLanguage,
  onLanguageChange,
  showSuccess,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("userSettings.languageCardTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("userSettings.languageCardSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="max-w-xs space-y-2">
          <label className="block text-xs font-semibold text-text">
            {t("userSettings.languageLabel")}
          </label>
          <Select
            value={selectedLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            <option value="en">{t("userSettings.languageEnglish")}</option>
            <option value="hu">{t("userSettings.languageHungarian")}</option>
          </Select>
          {showSuccess ? (
            <p className="text-xs font-medium text-primary-strong">
              {t("userSettings.languageUpdated")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};