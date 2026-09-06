/* ==========================================================================
   ADMIN NAVBATLARI — SAHIFALASH SHARTNOMASI

   Admin ro'yxatlari SERVER tomonida filtrlanadi va sahifalanadi. Bu
   `ApiListQuery`/`ApiPage` (kursorli) dan ATAYLAB farq qiladi: kursor
   cheksiz lentaga mos, admin navbatiga esa "42 tadan 7-sahifa" kerak —
   operator qancha ish qolganini ko'rishi va aniq sahifaga o'tishi shart.
   Shuning uchun bu yerda OFFSET (page/perPage) ishlatiladi.

   Backend shu shakldagi endpoint beradi:
     GET /api/v1/admin/queues/<nom>?page=1&perPage=10&search=&status=
   ========================================================================== */

/** Admin navbatiga so'rov. Barcha maydonlar ixtiyoriy. */
export interface AdminQueueQuery {
  /** 1-dan boshlanadi */
  page?: number;
  /** Sukut bo'yicha 10, eng ko'pi 100 */
  perPage?: number;
  /** Erkin matn qidiruvi (nom, id, email va h.k. bo'yicha) */
  search?: string;
  /** Holat filtri — "all" yoki navbatga xos qiymat */
  status?: string;
  /** Kategoriya filtri (xizmat/e'lon navbatlarida); foydalanuvchi
      navbatida — ROL, shikoyatlarda — sabab turi */
  category?: string;
  /** Faqat shikoyatlar navbatida — xavf darajasi. Har bir navbat
      shartnomaning o'ziga tegishli qismidan foydalanadi; bu real API'da
      ham shunday (`/queues/reports?severity=high`). */
  severity?: string;
}

/** Admin navbatining bitta sahifasi. */
export interface AdminPage<T> {
  items: T[];
  /** Joriy sahifa (1-dan) */
  page: number;
  perPage: number;
  /** FILTRDAN O'TGAN jami yozuvlar soni (sahifadagi emas) */
  total: number;
  /** `Math.ceil(total / perPage)`, kamida 1 */
  totalPages: number;
  /**
   * Holat bo'yicha sanoq — KPI kartochkalari uchun.
   *
   * MUHIM: `status` filtri QO'LLANMASDAN hisoblanadi (qidiruv esa
   * qo'llanadi). Sabab: "Faol 128 · To'xtatilgan 4" kabi kartochka har
   * doim bir xil turishi kerak, aks holda "To'xtatilgan" tabiga o'tganda
   * "Faol 0" ko'rinardi. `_all` kaliti — filtrsiz jami.
   *
   * Backend'da bu `COUNT(*) … GROUP BY status` — bitta arzon so'rov.
   */
  facets: Record<string, number>;
}

export type AdminRole =
  | "super_admin"
  | "operations"
  | "finance"
  | "support"
  | "trust_safety"
  | "kyc_reviewer"
  | "admin";

export type AdminPermission =
  | "dashboard"
  | "users"
  | "services"
  | "jobs"
  | "orders"
  | "kyc"
  | "disputes"
  | "payments"
  | "reports"
  | "appeals"
  | "reviews"
  | "support"
  | "categories"
  | "settings"
  | "audit"
  | "admins";

export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  title: string;
  active: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminSession {
  adminId: string;
  role: AdminRole;
  expiresAt: string;
}

export interface AuditEvent {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  details?: string;
  previousState?: string;
  newState?: string;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  targetId: string;
  targetType: "user" | "ticket" | "dispute" | "kyc" | "report" | "order";
  adminId: string;
  adminName: string;
  text: string;
  createdAt: string;
}

/* Pul yechish so'rovi endi UMUMIY model (`lib/types.ts`) — uni foydalanuvchi
   tomoni yaratadi, admin esa qayta ishlaydi. Ilgari bu yerda alohida
   e'lon qilingan edi va ikki tomon bir-biridan xabarsiz ishlardi. */
export type { WithdrawalRequest, WithdrawalStatus } from "@/lib/types";

export interface TransactionRecord {
  id: string;
  type: "deposit" | "escrow_mablaglash" | "milestone_tolov" | "refund" | "yechish" | "commission";
  userId: string;
  userName: string;
  amount: number;
  currency: "UZS";
  referenceId: string;
  description: string;
  status: "muvaffaqiyatli" | "kutilmoqda" | "bekor_qilingan";
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  contractId: string;
  contractTitle: string;
  buyerId: string;
  buyerName: string;
  specialistId: string;
  specialistName: string;
  totalAmount: number;
  refundAmount: number;
  reason: string;
  status: "completed" | "rejected";
  processedBy: string;
  createdAt: string;
}

export interface TrustReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: "user" | "service" | "job" | "message";
  targetId: string;
  targetTitle: string;
  reasonType:
    | "scam"
    | "spam"
    | "plagiarism"
    | "off_platform"
    | "inappropriate"
    | "fake_profile"
    | "copyright";
  description: string;
  evidenceUrl?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "investigating" | "resolved" | "dismissed";
  assignedAdminId?: string;
  assignedAdminName?: string;
  resolutionNote?: string;
  actionTaken?: "none" | "warned" | "restricted" | "suspended" | "removed";
  createdAt: string;
  resolvedAt?: string;
}

export interface UserAppeal {
  id: string;
  userId: string;
  userName: string;
  userRole: "mutaxassis" | "xaridor";
  restrictionType: "suspended" | "blocked" | "restricted";
  originalReason: string;
  appealText: string;
  evidenceUrls: string[];
  status: "pending" | "reviewing" | "accepted" | "rejected";
  reviewerId?: string;
  reviewerName?: string;
  decisionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CategoryManagementItem {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  order: number;
  active: boolean;
  serviceCount: number;
  subcategories: {
    id: string;
    slug: string;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    active: boolean;
  }[];
}

export interface PlatformSettingItem {
  key: string;
  group: "marketplace" | "finance" | "escrow" | "security";
  label: string;
  description: string;
  value: string | number | boolean;
  type: "text" | "number" | "boolean" | "percent";
  /** Faqat ko'rsatiladi — qiymat build vaqtida yoki backend'da belgilanadi */
  readOnly?: boolean;
}

export interface ReviewModerationItem {
  id: string;
  contractId: string;
  contractTitle: string;
  authorId: string;
  authorName: string;
  targetId: string;
  targetName: string;
  rating: number;
  comment: string;
  status: "approved" | "flagged" | "hidden";
  reportCount: number;
  createdAt: string;
}


/** Yordam chiptasidagi bitta yozishma xabari (`sb2_ticket_chat_<id>`).
    Ilgari bu shakl `lib/admin-api.ts` ichida ham, admin sahifasida ham
    alohida inline yozilgan edi — ikkisi ajralib ketishi mumkin edi. */
export interface TicketMessage {
  sender: string;
  text: string;
  at: string;
  isAdmin: boolean;
}
