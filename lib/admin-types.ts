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

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: "mutaxassis" | "xaridor";
  amount: number;
  currency: "UZS";
  cardDetails: string;
  status: "kutilmoqda" | "tasdiqlangan" | "rad_etilgan" | "korib_chiqilmoqda";
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

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

