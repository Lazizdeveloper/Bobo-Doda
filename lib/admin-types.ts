export type AdminRole = "super_admin" | "admin";

export type AdminPermission =
  | "dashboard"
  | "users"
  | "kyc"
  | "disputes"
  | "payments"
  | "support"
  | "content"
  | "monitoring"
  | "audit"
  | "admins"
  | "system";

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
