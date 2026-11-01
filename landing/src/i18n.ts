import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

void i18n.use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: "en", supportedLngs: ["en", "hu"],
  resources: { en: { translation: { brand: "ChronoSync" } }, hu: { translation: { brand: "ChronoSync" } } },
  detection: { order: ["localStorage", "navigator"], lookupLocalStorage: "chronosync:site-language", caches: ["localStorage"] },
  interpolation: { escapeValue: false },
});
