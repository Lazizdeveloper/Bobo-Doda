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

function humanizeFallback(key: string): string {
  const segment = key.includes(".") ? (key.split(".").pop() || key) : key;
  const words = segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* Ingliz tili alohida faylda (en.ts) — dictionary.ts (uz/ru) tuzilishiga
   tegmasdan qo'shildi. en topilmasa uz'ga tushadi. */
export function translate(lang: Lang, key: string): string {
  if (!key) return "";

  // 1. Direct target locale lookup
  let targetVal: string | undefined;
  if (lang === "en") {
    targetVal = en[key];
  } else if (lang === "ru") {
    targetVal = dictionary[key]?.ru;
  } else {
    targetVal = dictionary[key]?.uz;
  }

  if (targetVal !== undefined && targetVal.trim() !== "") {
    return targetVal;
  }

  // 2. Dev / test environment: missing translation must be detectable in tests & console
  if (process.env.NODE_ENV !== "production") {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(`[i18n] Missing translation for key: "${key}" (lang: ${lang})`);
    }
    return key;
  }

  // 3. Production environment: safe fallback chain
  // Fallback to default locale (uz)
  const defaultVal = dictionary[key]?.uz;
  if (defaultVal !== undefined && defaultVal.trim() !== "") {
    return defaultVal;
  }

  // Fallback to alternative locale
  const altVal = lang === "en" ? dictionary[key]?.ru : en[key];
  if (altVal !== undefined && altVal.trim() !== "") {
    return altVal;
  }

  // Final production safety: human-readable label, never raw dot-separated key
  return humanizeFallback(key);
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "uz",
  setLang: () => {},
  t: (key) => translate("uz", key),
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
