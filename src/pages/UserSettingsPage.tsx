import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePreferencesCard } from "../components/user-settings/LanguagePreferencesCard";
import { PasswordSecurityCard } from "../components/user-settings/PasswordSecurityCard";
import { UserSettingsHeader } from "../components/user-settings/UserSettingsHeader";

const normalizeLanguageCode = (language: string | undefined) => {
  if (!language) {
    return "en";
  }

  return language.toLowerCase().startsWith("hu") ? "hu" : "en";
};

export const UserSettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage || i18n.language),
  );
  const [langSuccess, setLangSuccess] = useState(false);
  const languageSuccessTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (languageSuccessTimerRef.current !== null) {
        window.clearTimeout(languageSuccessTimerRef.current);
      }
    };
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    i18n.changeLanguage(newLang);
    setLangSuccess(true);
    if (languageSuccessTimerRef.current !== null) {
      window.clearTimeout(languageSuccessTimerRef.current);
    }

    languageSuccessTimerRef.current = window.setTimeout(() => {
      setLangSuccess(false);
    }, 3000);
  };

  return (
    <div className="mx-auto w-full space-y-8 p-6">
      <UserSettingsHeader />

      <LanguagePreferencesCard
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        showSuccess={langSuccess}
      />

      <PasswordSecurityCard />
    </div>
  );
};
