"use client";

import { useCallback, useEffect, useState } from "react";

const MAX_DEFAULT = 5;

/** Localstorage'da qidiruv so'rovlari tarixi — "sb2_recent_search:<key>".
   Faqat client'da; navigatordan tashqariga chiqmaydi. */
export function useRecentSearches(key: string, max = MAX_DEFAULT) {
  const storageKey = `sb2_recent_search:${key}`;
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* buzilgan yozuv e'tiborsiz qoldiriladi */
    }
  }, [storageKey]);

  const addSearch = useCallback(
    (query: string) => {
      const clean = query.trim();
      if (!clean) return;
      setRecent((prev) => {
        const next = [clean, ...prev.filter((q) => q !== clean)].slice(0, max);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* kvota to'lsa jimgina o'tkazib yuboriladi — tarix ikkinchi darajali */
        }
        return next;
      });
    },
    [storageKey, max]
  );

  const clear = useCallback(() => {
    setRecent([]);
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { recent, addSearch, clear };
}
