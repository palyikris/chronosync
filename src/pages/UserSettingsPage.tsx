import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { LanguagePreferencesCard } from "../components/user-settings/LanguagePreferencesCard";
import { PasswordSecurityCard } from "../components/user-settings/PasswordSecurityCard";
import { TimesheetTimerVisibilityCard } from "../components/user-settings/TimesheetTimerVisibilityCard";
import { UserSettingsHeader } from "../components/user-settings/UserSettingsHeader";
import { WorkHoursCard } from "../components/user-settings/WorkHoursCard";
import { FavoriteProjectsCard } from "../components/user-settings/FavoriteProjectsCard";

const normalizeLanguageCode = (language: string | undefined) => {
  if (!language) {
    return "en";
  }

  return language.toLowerCase().startsWith("hu") ? "hu" : "en";
};

export const UserSettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const { hash } = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage || i18n.language),
  );
  const [langSuccess, setLangSuccess] = useState(false);
  const languageSuccessTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    if (hash === "#favorite-projects") {
      const card = document.getElementById("favorite-projects");
      card?.scrollIntoView({ block: "start" });
      card?.focus({ preventScroll: true });
    }
  }, [hash]);

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
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <UserSettingsHeader />

      <LanguagePreferencesCard
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        showSuccess={langSuccess}
      />

      <TimesheetTimerVisibilityCard />

      <FavoriteProjectsCard />

      <WorkHoursCard />

      <PasswordSecurityCard />
    </div>
  );
};
