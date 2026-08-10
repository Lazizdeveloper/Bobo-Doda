export type AdminRole = "super_admin" | "admin";

export type AdminPermission =
  | "dashboard"
  | "users"
  | "kyc"
  | "disputes"
  | "payments"
  | "support"
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
  type: "deposit" | "escrow_mablaglash" | "milestone_tolov" | "refund" | "yechish";
  userId: string;
  userName: string;
  amount: number;
  currency: "UZS";
  referenceId: string;
  description: string;
  createdAt: string;
}

