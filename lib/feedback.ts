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

const SEED_FEEDBACKS: PageFeedback[] = [
  {
    id: "fb_1",
    type: "kamchilik",
    message: "Xizmatlar bozorida sahifalash (pagination) tugmasi ba'zan oxirgi sahifaga o'tkazmayapti.",
    pageUrl: "/xaridor/bozor",
    pageTitle: "Xizmatlar Bozori",
    userName: "Javohir Toshmatov",
    userRole: "xaridor",
    status: "yangi",
    createdAt: "2026-03-06T10:15:00.000Z",
  },
  {
    id: "fb_2",
    type: "taklif",
    message: "Ish e'lonlari sahifasida byudjet bo'yicha maxsus slaydli filtr qo'shilsa juda qulay bo'lardi.",
    pageUrl: "/mutaxassis/ish-elonlari",
    pageTitle: "Ish e'lonlari qidiruvi",
    userName: "Dilshodbek Rustamov",
    userRole: "mutaxassis",
    status: "korildi",
    adminNote: "Dizaynerlar bilan rejalashtirildi",
    createdAt: "2026-03-05T14:30:00.000Z",
  },
  {
    id: "fb_3",
    type: "kamchilik",
    message: "FAQ sahifasida to'lovlar bo'limi ochilganda skroll tepaga sakrab ketyapti.",
    pageUrl: "/savol-javob",
    pageTitle: "Ko'p so'raladigan savollar",
    userName: "Mehmon (Anonim)",
    userRole: "mehmon",
    status: "hal_qilindi",
    adminNote: "Smooth-scroll tuzatildi",
    createdAt: "2026-03-04T09:20:00.000Z",
  },
];

function readFeedbacks(): PageFeedback[] {
  if (typeof window === "undefined") return SEED_FEEDBACKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_FEEDBACKS));
      return SEED_FEEDBACKS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_FEEDBACKS;
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
