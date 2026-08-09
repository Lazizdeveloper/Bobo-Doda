"use client";

import { useCallback, useEffect, useRef } from "react";

interface DraftEnvelope<T> {
  version: 1;
  savedAt: string;
  value: T;
}

export function useFormDraft<T>(
  key: string,
  value: T,
  restore: (value: T) => void,
  dirty: boolean
) {
  const restoreRef = useRef(restore);
  const skipFirstSave = useRef(true);
  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      if (parsed.version === 1) restoreRef.current(parsed.value);
    } catch {
      sessionStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      const envelope: DraftEnvelope<T> = {
        version: 1,
        savedAt: new Date().toISOString(),
        value,
      };
      sessionStorage.setItem(key, JSON.stringify(envelope));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [dirty, key, value]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return useCallback(() => sessionStorage.removeItem(key), [key]);
}
