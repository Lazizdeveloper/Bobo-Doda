"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dictionary, type Lang } from "./dictionary";
import { en } from "./en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

/* Ingliz tili alohida faylda (en.ts) — dictionary.ts (uz/ru) tuzilishiga
   tegmasdan qo'shildi. en topilmasa uz'ga tushadi. */
function translate(lang: Lang, key: string): string {
  if (lang === "en") return en[key] ?? dictionary[key]?.uz ?? key;
  return dictionary[key]?.[lang] ?? dictionary[key]?.uz ?? key;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "uz",
  setLang: () => {},
  t: (key) => dictionary[key]?.uz ?? key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");

  useEffect(() => {
    const storedLang = window.localStorage.getItem("sb_lang");
    if (storedLang === "uz" || storedLang === "ru" || storedLang === "en") {
      setLangState(storedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("sb_lang", next);
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): LanguageContextValue {
  return useContext(LanguageContext);
}

export type { Lang };
