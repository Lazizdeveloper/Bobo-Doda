import type * as Model from "@/lib/types";
import type { PaymentStatus } from "./state-machines";

export interface ApiPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface ApiListQuery {
  cursor?: string;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface PaymentDTO {
  id: string;
  contractId: string;
  provider: "click" | "payme" | "card";
  providerReference?: string;
  idempotencyKey: string;
  amount: number;
  currency: "UZS";
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthService {
  /**
   * Joriy sessiya — SINXRON va shunday qoladi.
   *
   * Backend'da bu access token'ning o'zi emas, uning brauzerda saqlangan
   * SNAPSHOT'i (userId/role/verified). Token httpOnly cookie'da bo'ladi va
   * JS uni o'qiy olmaydi — shuning uchun bu yerda faqat "kim kirgan"
   * ma'lumoti turadi. Layout guard'lari va xabar egaligini hisoblash har
   * render'da kerak bo'lgani uchun bu chaqiruv async bo'la olmaydi.
   *
   * MUHIM: bu snapshot HIMOYA EMAS — u brauzerda o'zgartirilishi mumkin.
   * Haqiqiy tekshiruv har so'rovda server tomonida bo'ladi.
   */
  getSession(): Model.Session | null;
  login(input: { phone: string; password: string }): Promise<Model.Session>;
  register(input: { phone: string; password: string; fullName: string }): Promise<Model.Session>;
  loginWithTelegram(payload?: { id?: string; username?: string; first_name?: string; role?: Model.UserRole }): Promise<Model.Session>;
  loginWithGoogle(payload?: { email?: string; name?: string; sub?: string; role?: Model.UserRole }): Promise<Model.Session>;
  verifyTelegram(code?: string): Promise<Model.Session>;
  verifyGoogle(email?: string): Promise<Model.Session>;
  chooseRole(role: Model.UserRole): Promise<Model.Session>;
  resetPassword(input: {
    phone: string;
    code: string;
    newPassword: string;
    method?: "telegram" | "google";
  }): Promise<void>;
  /**
   * Access token'ni yangilaydi (`POST /auth/refresh`).
   *
   * Qaytaradi: yangilangan sessiya, yoki `null` — refresh token ham
   * o'lgan bo'lsa (foydalanuvchi qayta kirishi kerak).
   *
   * Kim chaqiradi: `client.ts` dagi HTTP qatlami. Har qanday so'rov 401
   * bilan qaytsa — BIR MARTA `refresh()` qilinadi va so'rov qayta
   * yuboriladi; ikkinchi 401 da `logout()` va login'ga yo'naltirish.
   * Bu mantiq UI'da EMAS, adapterda bo'lishi shart, aks holda har bir
   * ekran o'zi token boshqarishi kerak bo'lardi.
   *
   * Mock'da amalda hech narsa qilmaydi (token yo'q) — shartnoma
   * backend uchun mavjud.
   */
  refresh(): Promise<Model.Session | null>;
  logout(): void;
}

export interface UsersService {
  getCurrent(): Promise<Model.User | null>;
  getSellerProfile(): Promise<Model.SellerProfile>;
  updateName(fullName: string): Promise<void>;
  updateUserProfile(data: Partial<Model.User>): Promise<void>;
  completeSellerProfile(input: {
    fullName: string;
    bio: string;
    skills: string[];
    categories: string[];
    location: string;
  }): Promise<void>;
  updateSellerProfile(input: {
    fullName: string;
    bio: string;
    headline?: string;
    skills?: string[];
    categories?: string[];
    location?: string;
    languages?: Model.ProfileLanguage[];
    portfolio?: Model.PortfolioItem[];
  }): Promise<void>;
  setAvailability(available: boolean): Promise<void>;
  getPreferences(): Promise<Model.AccountPreferences>;
  savePreferences(preferences: Model.AccountPreferences): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  exportData(): Promise<Record<string, unknown>>;
  deleteAccount(): Promise<void>;
}

/** Ochiq katalog: mutaxassis profillari va ular haqidagi sharhlar */
export interface CatalogService {
  listSpecialists(): Promise<Model.Specialist[]>;
  getSpecialist(userId: string): Promise<Model.Specialist | null>;
  listSellerReviews(sellerId: string): Promise<Model.Review[]>;
}

/** Saqlangan (bookmark) elementlar — e'lonlar va bozor kartalari */
export interface SavedService {
  listJobIds(): Promise<string[]>;
  toggleJob(jobId: string): Promise<string[]>;
  listMarketIds(): Promise<string[]>;
  toggleMarketItem(id: string): Promise<string[]>;
}

export interface ServicesService {
  listMine(): Promise<Model.Service[]>;
  listPublic(): Promise<Model.Service[]>;
  get(id: string): Promise<Model.Service | null>;
  create(input: Omit<Model.Service, "id" | "sellerId" | "currency" | "createdAt">): Promise<Model.Service>;
  update(id: string, input: Partial<Omit<Model.Service, "id" | "sellerId" | "createdAt">>): Promise<Model.Service>;
  remove(id: string): Promise<void>;
}

export interface JobsService {
  list(): Promise<Model.Job[]>;
  get(id: string): Promise<Model.Job | null>;
  listMine(): Promise<Model.Job[]>;
  create(input: {
    title: string;
    description: string;
    category: Model.Job["category"];
    budgetMin: number;
    budgetMax: number;
    skillsRequired: string[];
    screeningQuestions: string[];
    deadline?: string;
    attachedImages?: string[];
  }): Promise<Model.Job>;
  close(id: string): Promise<Model.Job>;
}

export interface ProposalsService {
  listMine(): Promise<Model.Proposal[]>;
  get(id: string): Promise<Model.Proposal | null>;
  listForJob(jobId: string): Promise<Model.Proposal[]>;
  create(input: {
    jobId: string;
    bidAmount: number;
    coverLetter: string;
    screeningAnswers: { question: string; answer: string }[];
    attachedImages: string[];
    estimatedDeliveryDays?: number;
  }): Promise<Model.Proposal>;
  setStatus(
    id: string,
    status: "korib_chiqilmoqda" | "suhbat" | "rad_etildi"
  ): Promise<Model.Proposal>;
  hire(
    proposalId: string,
    milestones: {
      title: string;
      description: string;
      amount: number;
      dueDate: string;
    }[]
  ): Promise<Model.Contract>;
  withdraw(id: string): Promise<Model.Proposal>;
}

export interface OffersService {
  get(id: string): Promise<Model.Offer | null>;
  create(input: {
    sellerId: string;
    serviceId?: string;
    title: string;
    message: string;
    budget: number;
  }): Promise<Model.Offer>;
  listSent(): Promise<Model.Offer[]>;
  listIncoming(): Promise<Model.Offer[]>;
  accept(id: string): Promise<Model.Contract>;
  withdraw(id: string): Promise<Model.Offer>;
  decline(id: string): Promise<Model.Offer>;
}

export interface ContractsService {
  list(): Promise<Model.Contract[]>;
  get(id: string): Promise<Model.Contract | null>;
  cancel(id: string): Promise<Model.Contract>;
  requestClose(id: string, note?: string): Promise<Model.Contract>;
  approveClose(id: string): Promise<Model.Contract>;
}

export interface MilestonesService {
  list(contractId: string): Promise<Model.Milestone[]>;
  listMine(): Promise<Model.Milestone[]>;
  submit(
    id: string,
    deliverable?: {
      link?: string;
      note?: string;
      files?: Model.DeliverableFile[];
    }
  ): Promise<Model.Milestone>;
  accept(id: string): Promise<Model.Milestone>;
  requestRevision(id: string, comment: string): Promise<Model.Milestone>;
}

/** Biriktirma fayllarni yuklash (chat va ish topshirish uchun bir xil).
    Mock'da fayl data-URL ga o'giriladi; backend'da `POST /files` ga
    yuboriladi va doimiy URL qaytadi — chaqiruvchi UI o'zgarmaydi. */
export interface FilesService {
  upload(file: File): Promise<Model.DeliverableFile>;
}

export interface PaymentsService {
  /** Escrow'ni to'liq mablag'lash.
   *  `input` — to'lov usuli va (karta bo'lsa) qaysi karta. Mock uni faqat
   *  yozib qo'yadi, lekin CHEGARADA turishi shart: real gateway "qaysi
   *  usul, qaysi instrument" ni bilmasa to'lovni umuman boshlay olmaydi,
   *  va bu ma'lumot allaqachon UI'da bor edi — shunchaki tashlab
   *  yuborilardi. */
  fundContract(
    id: string,
    input?: {
      method: Model.PaymentMethod;
      cardId?: string;
      receiptUrl?: string;
      receiptName?: string;
    }
  ): Promise<Model.Contract>;
  getBalance(): Promise<number>;
  getCards(): Promise<Model.PaymentCard[]>;
  addCard(input: {
    number: string;
    holderName: string;
    expiry: string;
  }): Promise<Model.PaymentCard>;
  removeCard(id: string): Promise<void>;
  /* Yechish ADMIN TASDIG'IGA so'rov yuboradi — pul darhol yechilmaydi.
     Ilgari ikkalasi ham darhol yechar va admin navbatiga umuman tushmasdi. */
  /** Mutaxassis daromadini yechish so'rovi (karta yoki bank hisob-raqamiga) */
  withdrawEarnings(
    destination: string | { type: "card"; cardId: string } | { type: "bank_account"; bankAccount: Model.BankAccountDetails },
    amount?: number
  ): Promise<Model.WithdrawalRequest>;
  /** Xaridor balansidagi (qaytgan escrow) mablag'ni yechish so'rovi */
  withdrawBalance(
    destination: string | { type: "card"; cardId: string } | { type: "bank_account"; bankAccount: Model.BankAccountDetails },
    amount?: number
  ): Promise<Model.WithdrawalRequest>;
  getWithdrawnTotal(): Promise<number>;
  /** Kutilayotgan so'rovlar summasi — mavjud mablag'dan ayiriladi */
  getPendingWithdrawalTotal(): Promise<number>;
  listMyWithdrawalRequests(): Promise<Model.WithdrawalRequest[]>;
}

export interface MessagesService {
  list(threadId: string): Promise<Model.Message[]>;
  listMine(): Promise<Model.Message[]>;
  send(
    threadId: string,
    body: string,
    image?: string,
    attachments?: { images?: string[]; files?: Model.DeliverableFile[] }
  ): Promise<Model.Message>;
  /** threadId -> joriy foydalanuvchi shu suhbatni oxirgi marta o'qigan vaqt */
  getReadStatus(): Promise<Record<string, string>>;
  /** Suhbat sahifasi ochilganda chaqiriladi, uni "o'qilgan" deb belgilaydi */
  markRead(threadId: string): Promise<void>;
}

export interface NotificationsService {
  list(): Promise<Model.AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ReviewsService {
  listMine(): Promise<Model.Review[]>;
  getForContract(contractId: string): Promise<Model.Review | null>;
  create(contractId: string, rating: number, comment: string): Promise<Model.Review>;
}

export interface DisputesService {
  getForContract(contractId: string): Promise<Model.Dispute | null>;
  open(
    contractId: string,
    input: Pick<Model.Dispute, "reason" | "description" | "evidence">
  ): Promise<Model.Dispute>;
  /** Nizoni ochgan tomon uni qaytarib oladi — shartnoma `faol` ga qaytadi */
  withdraw(contractId: string): Promise<void>;
}

export interface VerificationService {
  getMine(): Promise<Model.VerificationRecord | null>;
  submit(input: Omit<Model.VerificationRecord, "userId" | "status" | "submittedAt" | "rejectionReason">): Promise<Model.VerificationRecord>;
}

export interface SupportService {
  listMine(): Promise<Model.SupportTicket[]>;
  /** Chiptaga kelgan support javoblari (egalik tekshiriladi) */
  listReplies(ticketId: string): Promise<Model.SupportReply[]>;
  create(input: Pick<Model.SupportTicket, "topic" | "subject" | "message">): Promise<Model.SupportTicket>;
}

/** In-site Support Modal — real backend (`/api/support`) orqali Telegram
    support chatga yetkaziladi. Boshqa servicelardan farqli, mock-api emas,
    haqiqiy `fetch` bilan ishlaydi (`client.ts`da). */
export interface SupportRequestService {
  submit(input: Model.SupportRequestInput & { userId?: string }): Promise<void>;
}
