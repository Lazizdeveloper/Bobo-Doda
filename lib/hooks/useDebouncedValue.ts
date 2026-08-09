import { useEffect, useState } from "react";

/* Qiymatni kechiktirib qaytaradi — qidiruvni har harfda emas, tinchlangach
   ishga tushiradi. Backend qidiruvga o'tganda ham shu qiymat API'ga beriladi. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
