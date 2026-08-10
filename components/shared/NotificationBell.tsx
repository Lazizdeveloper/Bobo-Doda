"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { notificationsService, DATA_CHANGED_EVENT } from "@/lib/api";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

const kindIcons: Record<NotificationKind, string> = {
  elon: "M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 6h14v10H3V6Zm0 4h14",
  taklif: "M17 3 3 8.2l4.5 1.8L9.5 16l3-4.2L17 3Z",
  bosqich: "M6 2h6l3 3v13H6V2Zm6 0v3h3M9 9h5M9 12h5",
  xabar: "M3 4h14v9H7l-4 3V4Z",
  tolov: "M3 6h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3V6Zm0 0V4h11",
};

export function NotificationBell() {
  const { t, lang } = useT();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* Backend'da sessiya tugasa (401) yoki tarmoq uzilsa, har bir hodisa
       ushlanmagan rejection berardi — shuning uchun xatolar shu yerda yutiladi:
       eski ko'rsatkich saqlanadi, foydalanuvchini layout guard'i yo'naltiradi. */
    function refresh() {
      notificationsService
        .list()
        .then(setNotifications)
        .catch(() => setNotifications([]));
    }
    refresh();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const unread = notifications.filter((n) => !n.read).length;

  function notifText(n: AppNotification): string {
    let text = t(n.messageKey);
    for (const [key, value] of Object.entries(n.params ?? {})) {
      text = text.replace(`{${key}}`, value);
    }
    return text;
  }

  async function handleMarkAll() {
    try {
      await notificationsService.markAllRead();
      setNotifications(await notificationsService.list());
    } catch {
      /* server rad etsa ro'yxat o'zgarmaydi — keyingi refresh haqiqiy holatni beradi */
    }
  }

  function handleOpenNotification(id: string, read: boolean) {
    setPanelOpen(false);
    if (read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    notificationsService.markRead(id).catch(() => {});
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-label={t("ntf.open")}
        aria-expanded={panelOpen}
        className="relative rounded-btn p-2 text-muted transition-colors duration-150 hover:bg-card-hover hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2.5a5 5 0 0 0-5 5v3L3.5 13.5v1h13v-1L15 10.5v-3a5 5 0 0 0-5-5ZM8 16.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-on-primary"
            aria-label={`${unread}`}
          >
            {unread}
          </span>
        )}
      </button>

      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setPanelOpen(false)}
            aria-hidden="true"
          />
          <div className="sb-fade-in absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-card shadow-overlay">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-heading text-sm font-bold text-ink">
                {t("ntf.title")}
              </h3>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-2xs font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                >
                  {t("ntf.markAll")}
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-faint">
                  {t("ntf.empty")}
                </p>
              ) : (
                notifications.map((n, i) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => handleOpenNotification(n.id, n.read)}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-card-hover ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        n.read ? "bg-card-hover text-faint" : "bg-primary/10 text-primary-deep"
                      }`}
                      aria-hidden="true"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path d={kindIcons[n.kind]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-xs ${
                          n.read ? "text-muted" : "font-medium text-ink"
                        }`}
                      >
                        {notifText(n)}
                      </span>
                      <span className="mt-0.5 block text-2xs text-faint">
                        {formatDate(n.createdAt, lang)}
                      </span>
                    </span>
                    {!n.read && (
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
