"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { feedbackService, type FeedbackType } from "@/lib/feedback";
import { useToast } from "@/components/ui/Toast";

const BUG_CHIPS = [
  "Taklif yuborishda xatolik",
  "Fayl yoki rasm birikmayapti",
  "Qidiruv / filtr ishlamayapti",
  "To'lov yoki hisob-kitob",
  "Mobil ko'rinishda matn sig'magan",
];

const SUGGESTION_CHIPS = [
  "Portfolio rasmlarini to'liq ko'rish",
  "SMS yoki Telegram bildirishnoma",
  "Tezkor saralash filtri",
  "Taklif matni shablonlari",
  "Xavfsiz to'lovni tezlashtirish",
];

export function PageFeedbackWidget() {
  const pathname = usePathname();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("kamchilik");
  const [message, setMessage] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Initial load & localStorage persistence for collapse preference
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("bobododa_feedback_collapsed");
      if (saved === "true") setIsCollapsed(true);
    } catch {}
  }, []);

  // Update page title dynamically
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPageTitle(document.title || pathname);
    }
  }, [pathname]);

  // Global event listener for external triggers (e.g. from footer, help menu)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("bobododa:open-feedback", handleOpen);
    return () => window.removeEventListener("bobododa:open-feedback", handleOpen);
  }, []);

  // Auto-shrink on scroll to never block content reading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsScrolling(false);
      }, 1200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Admin panel & internal management routes are excluded from widget
  if (!mounted || pathname.startsWith("/admin") || pathname.startsWith("/rahbariyat")) {
    return null;
  }

  // Route-aware positioning:
  // In workrooms & chat (/shartnomalar/[id], /xabarlar, /suhbatlar), bottom is occupied by the chat textarea & Send button.
  // We lift the widget up so it never blocks chat interactions.
  const isWorkroomOrChat =
    pathname.startsWith("/shartnomalar") ||
    pathname.includes("/suhbatlar") ||
    pathname.includes("/xabarlar");

  const positionClasses = isWorkroomOrChat
    ? "bottom-28 right-4 sm:bottom-28 sm:right-6"
    : "bottom-20 right-4 sm:bottom-6 sm:right-6";

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bobododa_feedback_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleChipClick = (chip: string) => {
    if (!message.trim()) {
      setMessage(`${chip}: `);
    } else if (!message.includes(chip)) {
      setMessage((prev) => `${prev.trim()} [${chip}] `);
    }
  };

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

      toast("Rahmat! Xabaringiz qabul qilindi va ma'muriyatga yetkazildi.", "success");
      setMessage("");
      setIsOpen(false);
    } catch {
      toast("Xatolik yuz berdi. Qayta urinib ko'ring.", "error");
    } finally {
      setSending(false);
    }
  }

  const chips = type === "kamchilik" ? BUG_CHIPS : SUGGESTION_CHIPS;

  return (
    <>
      {/* Suzib yuruvchi aqlli vidjet triggeri (Floating Trigger) */}
      <div
        className={`fixed z-40 transition-all duration-300 ease-out select-none ${positionClasses}`}
      >
        {isCollapsed || isScrolling ? (
          /* IXCHAM REJIM (Collapsed Circular Button): hech narsani to'smaydi, 46x46px */
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-primary/50 bg-card/95 text-primary shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-primary hover:bg-primary/10 active:scale-95 cursor-pointer"
              aria-label="Kamchilik yoki taklif bildirish"
              title="Shu sahifada kamchilik ko'rdingizmi?"
            >
              <svg
                width="20"
                height="20"
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
              {/* Nozik puls indikatori */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
            </button>

            {/* Hoverda ochiladigan tushuntirish */}
            <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-card/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-md backdrop-blur">
              <span>Fikr / Kamchilik</span>
              <button
                type="button"
                onClick={toggleCollapse}
                className="pointer-events-auto ml-1 text-muted hover:text-ink cursor-pointer"
                title="Kengaytirish"
              >
                ↔
              </button>
            </div>
          </div>
        ) : (
          /* TO'LIQ REJIM (Expanded Pill): foydalanuvchi taqdim etgan dizayn */
          <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-card/95 p-1 pl-3.5 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-primary hover:shadow-xl">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-ink transition-colors hover:text-primary active:scale-98 sm:text-sm cursor-pointer"
              aria-label="Shu sahifada nima kamchilik ko'rdingiz?"
            >
              <span className="flex h-5 w-5 items-center justify-center text-primary">
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
              <span>Shu sahifada nima kamchilik ko&apos;rdingiz?</span>
            </button>

            {/* Kichraytirish (minimize) tugmasi */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink transition cursor-pointer"
              title="Kichraytirish (ixcham belgiga aylantirish)"
              aria-label="Kichraytirish"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* PASTKI DRAWER MODAL (Bottom Sheet Drawer — Rasm 2 bilan 1:1) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in">
          {/* Orqa fonni bosganda yopilish */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="relative z-10 w-full max-w-2xl rounded-t-3xl border-t border-line/80 bg-card p-5 pb-8 shadow-2xl transition-all duration-300 sm:p-7 sm:pb-9 animate-in slide-in-from-bottom"
          >
            {/* Tutqich / Drag bar */}
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-line/80" />

            {/* Sarlavha & Yopish */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="feedback-title" className="font-heading text-base font-extrabold text-ink sm:text-lg">
                  Nima kamchilik ko&apos;rdingiz?
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Shu sahifa haqida yozing. Qaysi sahifada ekaningizni o&apos;zimiz bilamiz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-ink transition cursor-pointer"
                aria-label="Yopish"
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
                  Kamchilik
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
                  Taklif
                </button>
              </div>

              {/* Bobo-Doda frilans bozoriga xos tezkor teglar (Quick Chips) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-semibold text-muted mr-1">Mavzular:</span>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="rounded-full border border-line bg-surface/60 px-2.5 py-1 text-2xs font-medium text-muted hover:border-primary/40 hover:bg-primary/5 hover:text-ink transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
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
                      ? "Masalan: taklif yuborishda fayl birikmayapti yoki mutaxassis qidiruvida filtrlar ishlamayapti..."
                      : "Masalan: mutaxassis portfolio rasmlarini to'liq hajmda ko'rish yoki buyurtma bo'yicha Telegram xabarnoma qo'shilsa yaxshi bo'lardi..."
                  }
                  className="w-full resize-none rounded-xl border border-line bg-surface/40 p-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              {/* Avto-aniqlangan sahifa ma'lumoti */}
              <div className="flex items-center justify-between text-2xs text-muted">
                <span className="truncate max-w-[300px] sm:max-w-md">
                  📍 Sahifa: <span className="font-mono text-ink font-semibold">{pathname}</span>
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Admin panelga yetkaziladi
                </span>
              </div>

              {/* Yuborish tugmasi */}
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none sm:text-base cursor-pointer"
              >
                {sending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
