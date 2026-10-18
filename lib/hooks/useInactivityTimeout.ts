import { useEffect, useRef } from "react";
import { authService, DATA_CHANGED_EVENT } from "@/lib/api";

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 daqiqa
export const DEFAULT_INACTIVITY_THROTTLE_MS = 5000; // 5 soniya
export const DEFAULT_CHECK_INTERVAL_MS = 15000; // 15 soniya
export const INACTIVITY_STORAGE_KEY = "bd_last_activity";
export const INACTIVITY_NOTICE_KEY = "bd_inactivity_logout";
export const INACTIVITY_SIGNAL_KEY = "bd_inactivity_signal";

export const INACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

export interface InactivityTimeoutOptions {
  /** Harakatsizlik chegarasi (ms). Sukut bo'yicha 30 daqiqa (1 800 000 ms). */
  timeoutMs?: number;
  /** Hodisalarni yozishni cheklash oralig'i (ms). Sukut bo'yicha 5000 ms. */
  throttleMs?: number;
  /** Tekshiruv davriyligi (ms). Sukut bo'yicha 15000 ms. */
  checkIntervalMs?: number;
  /** Vaqt tugaganda chaqiriladigan callback. */
  onTimeout?: () => void | Promise<void>;
}

/**
 * Global Inactivity Timeout hook:
 * Foydalanuvchi tizimga kirgan holatda uning harakatlarini kuzatadi
 * (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`).
 * 30 daqiqa davomida hech qanday harakat bo'lmasa:
 *   1. `authService.logout()` chaqiriladi;
 *   2. `bd_inactivity_logout` belgisi saqlanadi;
 *   3. `onTimeout` orqali xabar beriladi va `/kirish` ga yo'naltiriladi.
 *
 * Tablararo sinxronizatsiya: `localStorage` dagi `bd_last_activity` orqali
 * boshqa ochiq tabdagi harakatlar ham joriy tabning taymerini yangilab turadi,
 * ortiqcha takroriy yozishlarsiz (ping-pong prevention).
 */
export function useInactivityTimeout(options: InactivityTimeoutOptions = {}) {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    throttleMs = DEFAULT_INACTIVITY_THROTTLE_MS,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
    onTimeout,
  } = options;

  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isLoggingOut = false;
    let lastLocalRecorded = 0;

    function getStoredActivity(): number | null {
      try {
        const stored = window.localStorage.getItem(INACTIVITY_STORAGE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch {
        // localStorage mavjud bo'lmasa memory fallback
      }
      return lastLocalRecorded > 0 ? lastLocalRecorded : null;
    }

    function setStoredActivity(time: number): void {
      lastLocalRecorded = time;
      try {
        window.localStorage.setItem(INACTIVITY_STORAGE_KEY, String(time));
      } catch {
        // quota yoki xavfsizlik cheklovi
      }
    }

    function recordActivity(): void {
      if (isLoggingOut) return;
      // Faqat autentifikatsiyalangan foydalanuvchilar harakatini kuzatamiz
      const session = authService.getSession();
      if (!session) return;

      const now = Date.now();
      if (now - lastLocalRecorded < throttleMs) return;
      setStoredActivity(now);
    }

    async function triggerLogout(): Promise<void> {
      if (isLoggingOut) return;
      isLoggingOut = true;

      try {
        window.localStorage.removeItem(INACTIVITY_STORAGE_KEY);
        window.sessionStorage.setItem(INACTIVITY_NOTICE_KEY, "1");
        // Boshqa ochiq tablar uchun signal yuborish
        window.localStorage.setItem(INACTIVITY_SIGNAL_KEY, String(Date.now()));
        window.localStorage.removeItem(INACTIVITY_SIGNAL_KEY);
      } catch {
        // storage xavfsizlik cheklovi bo'lsa
      }

      try {
        await authService.logout();
      } catch {
        // tarmoq xatosi bo'lsa ham lokal tozalanadi
      }

      if (onTimeoutRef.current) {
        try {
          await onTimeoutRef.current();
        } catch {
          // callback xatosi
        }
      } else {
        if (window.location.pathname !== "/kirish") {
          window.location.replace("/kirish?reason=inactivity");
        }
      }
    }

    function checkInactivity(): void {
      if (isLoggingOut) return;

      const session = authService.getSession();
      if (!session) {
        // Authenticated sessiya yo'q — harakatsizlik taymeri ishlamaydi
        return;
      }

      const lastActivity = getStoredActivity();
      if (lastActivity === null) {
        // Sessiya bor, lekin timestamp hali yozilmagan bo'lsa
        setStoredActivity(Date.now());
        return;
      }

      const now = Date.now();
      if (lastActivity > now) {
        // Tizim soati kelajakka surilgan bo'lsa
        setStoredActivity(now);
        return;
      }

      const elapsed = now - lastActivity;
      if (elapsed >= timeoutMs) {
        void triggerLogout();
      }
    }

    // Boshlang'ich tekshiruv: sessiya mavjud bo'lsa darhol holatni aniqlash
    const initialSession = authService.getSession();
    if (initialSession) {
      const existing = getStoredActivity();
      if (!existing) {
        setStoredActivity(Date.now());
      } else if (existing > Date.now()) {
        setStoredActivity(Date.now());
      } else if (Date.now() - existing >= timeoutMs) {
        // Foydalanuvchi yo'qligida yoki tab yopiqligida vaqt o'tib ketgan — darhol logout!
        void triggerLogout();
      } else {
        lastLocalRecorded = existing;
      }
    }

    const eventOptions: AddEventListenerOptions = { passive: true };

    INACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, eventOptions);
    });

    const intervalId = window.setInterval(checkInactivity, checkIntervalMs);

    // Tab qayta faollashganda (sleep/wake yoki tab almashganda) darhol tekshirish
    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    }

    function handleFocus(): void {
      checkInactivity();
    }

    // Tablararo sinxronizatsiya: boshqa tabdagi harakatlar yoki sessiya o'zgarishi
    function handleStorageEvent(e: StorageEvent): void {
      if (e.key === INACTIVITY_STORAGE_KEY) {
        // Boshqa tabda harakat bo'ldi — faqat lokal xotiradagi timestampni yangilaymiz (localStorage qayta yozilmaydi)
        if (e.newValue) {
          const parsed = Number(e.newValue);
          if (!Number.isNaN(parsed) && parsed > 0) {
            lastLocalRecorded = parsed;
          }
        }
      } else if (e.key === INACTIVITY_SIGNAL_KEY) {
        // Boshqa tabda harakatsizlik sababli sessiya yakunlandi
        if (!isLoggingOut) {
          void triggerLogout();
        }
      } else if (e.key === "bd_session" || e.key === "sb_session") {
        if (!e.newValue) {
          // Boshqa tabda logout bo'ldi
          lastLocalRecorded = 0;
          try {
            window.localStorage.removeItem(INACTIVITY_STORAGE_KEY);
          } catch {}
          if (!isLoggingOut) {
            const isInactive = window.sessionStorage.getItem(INACTIVITY_NOTICE_KEY) === "1";
            if (isInactive) {
              void triggerLogout();
            }
          }
        } else {
          // Boshqa tabda yangi sessiya ochildi
          setStoredActivity(Date.now());
        }
      }
    }

    // Joriy tab ichidagi sessiya o'zgarishi
    function handleSessionChange(): void {
      const activeSession = authService.getSession();
      if (activeSession) {
        const stored = getStoredActivity();
        if (!stored || Date.now() - stored > timeoutMs) {
          setStoredActivity(Date.now());
        }
      } else {
        lastLocalRecorded = 0;
        try {
          window.localStorage.removeItem(INACTIVITY_STORAGE_KEY);
        } catch {}
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener(DATA_CHANGED_EVENT, handleSessionChange);

    return () => {
      INACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener(DATA_CHANGED_EVENT, handleSessionChange);
    };
  }, [timeoutMs, throttleMs, checkIntervalMs]);
}
