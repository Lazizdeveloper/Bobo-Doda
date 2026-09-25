"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { feedbackService, type FeedbackType } from "@/lib/feedback";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { isAdminSurfaceHost } from "@/lib/admin-routes";

export function PageFeedbackWidget() {
  const pathname = usePathname();
  const { toast } = useToast();
  const { t } = useT();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("kamchilik");
  const [message, setMessage] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setPageTitle(document.title || pathname);
    }
  }, [pathname]);

  // Global event orqali boshqa joylardan (masalan footer) ochish imkoniyati
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("bobododa:open-feedback", handleOpen);
    return () => window.removeEventListener("bobododa:open-feedback", handleOpen);
  }, []);

  // Escape bosilganda modal yopilishi
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Admin panel sahifalarida vidjet xalal bermasin. `mounted` allaqachon
  // client-only edi — admin.bobododa.uz'da (proxy.ts prefiksni striplagani
  // uchun) pathname `/admin` bilan boshlanmaydi, shuning uchun host
  // tekshiruvi ham qo'shildi (`mounted` gate ostida — hydration xavfsiz).
  if (!mounted || pathname.startsWith("/admin") || pathname.startsWith("/rahbariyat") || isAdminSurfaceHost()) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      await feedbackService.submit({
        type,
        message,
        pageUrl: typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname,
        pageTitle: pageTitle || pathname,
      });

      toast(t("feedback.success"), "success");
      setMessage("");
      setIsOpen(false);
    } catch {
      toast(t("feedback.error"), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* SUZIB TURUVCHI TUGMA: Hamma sahifada bir xil, o'zining qulay joyida */}
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 px-4 py-2 text-xs font-semibold text-ink shadow-md backdrop-blur-md transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:shadow-lg active:scale-95 sm:text-sm cursor-pointer"
          aria-label={t("feedback.widgetButton")}
        >
          {/* Piktogramma: chat bubble + plus */}
          <span className="flex h-5 w-5 items-center justify-center text-primary transition-transform duration-200 group-hover:scale-110">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </span>
          <span>{t("feedback.widgetButton")}</span>
        </button>
      </div>

      {/* PASTKI DRAWER MODAL (Bottom Sheet Drawer — Rasm bilan 1:1) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in">
          {/* Orqa fonni bosganda yopilish */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="relative z-10 w-full max-w-4xl lg:max-w-5xl rounded-t-3xl border-t border-line/80 bg-card p-5 pb-8 shadow-2xl transition-all duration-300 sm:p-7 sm:pb-9 animate-in slide-in-from-bottom"
          >
            {/* Tutqich / Drag bar */}
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-line/80" />

            {/* Sarlavha & Yopish */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="feedback-title" className="font-heading text-base font-extrabold text-ink sm:text-lg">
                  {t("feedback.title")}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {t("feedback.description")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-ink transition cursor-pointer"
                aria-label={t("common.close")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              {/* Turi: Kamchilik yoki Taklif tablari */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("kamchilik")}
                  className={`flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all sm:text-sm cursor-pointer ${
                    type === "kamchilik"
                      ? "border-primary bg-primary/10 text-primary shadow-2xs ring-2 ring-primary/20"
                      : "border-line bg-surface/50 text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {t("feedback.issue")}
                </button>
                <button
                  type="button"
                  onClick={() => setType("taklif")}
                  className={`flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all sm:text-sm cursor-pointer ${
                    type === "taklif"
                      ? "border-primary bg-primary/10 text-primary shadow-2xs ring-2 ring-primary/20"
                      : "border-line bg-surface/50 text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {t("feedback.suggestion")}
                </button>
              </div>

              {/* Matn kiritish maydoni — Bobo-Doda frilans bozoriga 100% mos misollar */}
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder={
                    type === "kamchilik"
                      ? t("feedback.issuePlaceholder")
                      : t("feedback.suggestionPlaceholder")
                  }
                  className="w-full resize-none rounded-xl border border-line bg-surface/40 p-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              {/* Avto-aniqlangan sahifa ma'lumoti */}
              <div className="flex items-center justify-between text-2xs text-muted">
                <span className="truncate max-w-[300px] sm:max-w-xl">
                  📍 {t("feedback.page")}: <span className="font-mono text-ink font-semibold">{pathname}</span>
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {t("feedback.sentToAdmin")}
                </span>
              </div>

              {/* Yuborish tugmasi */}
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none sm:text-base cursor-pointer"
              >
                {sending ? t("feedback.submitting") : t("feedback.submit")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
