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

export function LanguageProvider({
  children,
  initialLang = "uz",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    // Agar URL'da /ru yoki /en prefiksi bo'lsa, u ustun bo'ladi
    const pathname = window.location.pathname;
    if (pathname.startsWith("/ru/") || pathname === "/ru") {
      setLangState("ru");
      return;
    }
    if (pathname.startsWith("/en/") || pathname === "/en") {
      setLangState("en");
      return;
    }
    const storedLang = window.localStorage.getItem("sb_lang");
    if (storedLang === "uz" || storedLang === "ru" || storedLang === "en") {
      setLangState(storedLang);
      document.cookie = `sb_lang=${storedLang}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // Bosh sahifa sarlavhasi (document.title) tilga qarab moslashadi
    if (typeof document !== "undefined") {
      const p = window.location.pathname;
      if (p === "/" || p === "/ru" || p === "/en") {
        const titles: Record<Lang, string> = {
          uz: "Bobololadono — Mutaxassislar bozori",
          ru: "Bobololadono — Биржа специалистов",
          en: "Bobololadono — Specialist Marketplace",
        };
        document.title = titles[lang] || titles.uz;
      }
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sb_lang", next);
      document.cookie = `sb_lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }
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
