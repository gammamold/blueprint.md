import { createContext, useContext, useState, useEffect } from "react";
import { translations, SUPPORTED_LANGS } from "@/lib/translations";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState("en");

  // Load saved language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bp_lang");
    if (saved && translations[saved]) setLang(saved);
  }, []);

  const switchLang = (code) => {
    if (!translations[code]) return;
    setLang(code);
    localStorage.setItem("bp_lang", code);
  };

  // t("key") — returns translated string or falls back to English
  const t = (key) =>
    translations[lang]?.[key] ?? translations.en?.[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, switchLang, t, SUPPORTED_LANGS }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
