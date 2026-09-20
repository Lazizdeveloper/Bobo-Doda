import { DATA_CHANGED_EVENT } from "@/lib/api/client";
import { authService } from "@/lib/api/client";

export type FeedbackType = "kamchilik" | "taklif";
export type FeedbackStatus = "yangi" | "korildi" | "hal_qilindi" | "rad_etildi";

export interface PageFeedback {
  id: string;
  type: FeedbackType;
  message: string;
  pageUrl: string;
  pageTitle: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  userContact?: string;
  status: FeedbackStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY = "sb_page_feedbacks";

/* Bosqich 18 — ilgari bu yerda 3 ta O'YLAB TOPILGAN fikr-mulohaza yozuvi
   (soxta ism/sana bilan) bor edi va real foydalanuvchilarga HAQIQIY
   fikr sifatida ko'rsatilardi (`/admin/fikrlar`). Bu butun tizim
   `lib/api`ga ulanmagan — faqat localStorage'da (real backend endpoint
   yo'q), shuning uchun yuborilgan fikrlar ham hech qaysi adminga
   yetib bormaydi. Soxta seed olib tashlandi; widget o'zi (haqiqiy
   backend qamrovi yo'qligi sabab) hozircha o'zgarishsiz qoladi —
   RUNBOOK/PRODUCTION-READINESS'da ochiq gap sifatida hujjatlashtirilgan. */
function readFeedbacks(): PageFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFeedbacks(feedbacks: PageFeedback[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { key: STORAGE_KEY } }));
  } catch (err) {
    console.error("Failed to save feedback to localStorage:", err);
  }
}

export const feedbackService = {
  async list(): Promise<PageFeedback[]> {
    return readFeedbacks().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async submit(input: {
    type: FeedbackType;
    message: string;
    pageUrl: string;
    pageTitle?: string;
  }): Promise<PageFeedback> {
    const session = authService.getSession();
    const feedbacks = readFeedbacks();

    const newFeedback: PageFeedback = {
      id: "fb_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      type: input.type,
      message: input.message.trim(),
      pageUrl: input.pageUrl,
      pageTitle: input.pageTitle || input.pageUrl,
      userId: session?.userId,
      userName: session ? "Foydalanuvchi (" + session.userId.slice(0, 6) + ")" : "Mehmon (Anonim)",
      userRole: session?.role || "mehmon",
      status: "yangi",
      createdAt: new Date().toISOString(),
    };

    feedbacks.unshift(newFeedback);
    writeFeedbacks(feedbacks);
    return newFeedback;
  },

  async updateStatus(
    id: string,
    status: FeedbackStatus,
    adminNote?: string
  ): Promise<PageFeedback | null> {
    const feedbacks = readFeedbacks();
    const item = feedbacks.find((f) => f.id === id);
    if (!item) return null;

    item.status = status;
    if (adminNote !== undefined) item.adminNote = adminNote;
    item.updatedAt = new Date().toISOString();

    writeFeedbacks(feedbacks);
    return item;
  },

  async delete(id: string): Promise<boolean> {
    const feedbacks = readFeedbacks();
    const filtered = feedbacks.filter((f) => f.id !== id);
    if (filtered.length === feedbacks.length) return false;

    writeFeedbacks(filtered);
    return true;
  },

  getStats(): { total: number; bugs: number; suggestions: number; pending: number } {
    const list = readFeedbacks();
    return {
      total: list.length,
      bugs: list.filter((f) => f.type === "kamchilik").length,
      suggestions: list.filter((f) => f.type === "taklif").length,
      pending: list.filter((f) => f.status === "yangi").length,
    };
  },
};
