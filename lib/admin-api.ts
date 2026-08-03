"use client";

import type {
  Contract,
  Dispute,
  Job,
  Service,
  SupportTicket,
  User,
  VerificationRecord,
} from "@/lib/types";
import type {
  AdminAccount,
  AdminPermission,
  AdminSession,
  AuditEvent,
} from "@/lib/admin-types";
import {
  seedContracts,
  seedJobs,
  seedServices,
  seedUsers,
} from "@/lib/mock-api/seed";

const ADMIN_SESSION = "sb2_admin_session";
const ADMINS = "sb2_admin_accounts";
const AUDIT = "sb2_admin_audit";
const CREDENTIALS = "sb2_admin_credentials";
const SYSTEM_SETTINGS = "sb2_system_settings";

const allPermissions: AdminPermission[] = [
  "dashboard", "users", "kyc", "disputes", "payments", "support",
  "content", "monitoring", "audit", "admins", "system",
];

const seedAdmins: AdminAccount[] = [
  {
    id: "adm-ceo",
    fullName: "Saidkarim — CEO",
    email: "ceo@bobododa.uz",
    role: "super_admin",
    title: "Chief Executive Officer",
    active: true,
    permissions: allPermissions,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "adm-ops",
    fullName: "Dilnoza Rahimova",
    email: "admin@bobododa.uz",
    role: "admin",
    title: "Operations administrator",
    active: true,
    permissions: [
      "dashboard", "users", "kyc", "disputes", "payments",
      "support", "content", "monitoring",
    ],
    createdAt: "2026-05-12T09:00:00.000Z",
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function accounts() {
  const value = read<AdminAccount[]>(ADMINS, []);
  if (value.length) return value;
  write(ADMINS, seedAdmins);
  return seedAdmins;
}

function credentials() {
  const seed: Record<string, string> = {
    "ceo@bobododa.uz": "CEOsecure2026",
    "admin@bobododa.uz": "Adminsecure2026",
  };
  const value = read<Record<string, string>>(CREDENTIALS, {});
  if (Object.keys(value).length) return value;
  write(CREDENTIALS, seed);
  return seed;
}

export function getAdminSession(): AdminSession | null {
  const session = read<AdminSession | null>(ADMIN_SESSION, null);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    if (typeof window !== "undefined") localStorage.removeItem(ADMIN_SESSION);
    return null;
  }
  const account = accounts().find((item) => item.id === session.adminId);
  return account?.active ? session : null;
}

export function getCurrentAdmin(): AdminAccount | null {
  const session = getAdminSession();
  return session ? accounts().find((item) => item.id === session.adminId) ?? null : null;
}

export async function adminLogin(
  email: string,
  password: string,
  expectedRole?: AdminAccount["role"]
) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const normalized = email.trim().toLowerCase();
  const account = accounts().find((item) => item.email === normalized && item.active);
  const valid = credentials()[normalized] === password;
  if (!account || !valid || (expectedRole && account.role !== expectedRole)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const session: AdminSession = {
    adminId: account.id,
    role: account.role,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
  write(ADMIN_SESSION, session);
  const next = accounts().map((item) =>
    item.id === account.id ? { ...item, lastLoginAt: new Date().toISOString() } : item
  );
  write(ADMINS, next);
  addAudit("Tizimga kirdi", account.email, account);
  return session;
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_SESSION);
}

export function hasPermission(permission: AdminPermission) {
  return getCurrentAdmin()?.permissions.includes(permission) ?? false;
}

export function getAdminAccounts() {
  return accounts();
}

export function setAdminActive(id: string, active: boolean) {
  const current = requireSuperAdmin();
  if (id === current.id) throw new Error("SELF_LOCK");
  const next = accounts().map((item) => item.id === id ? { ...item, active } : item);
  write(ADMINS, next);
  addAudit(active ? "Admin faollashtirildi" : "Admin bloklandi", id, current);
  return next;
}

export function addAdmin(input: Pick<AdminAccount, "fullName" | "email" | "title"> & {
  password: string;
  permissions?: AdminPermission[];
}) {
  const current = requireSuperAdmin();
  const email = input.email.trim().toLowerCase();
  if (accounts().some((item) => item.email === email)) throw new Error("DUPLICATE");
  if (
    input.password.length < 10 ||
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password)
  ) throw new Error("WEAK_PASSWORD");
  const allowed = (input.permissions ?? [
    "dashboard", "users", "kyc", "disputes", "payments",
    "support", "content", "monitoring",
  ]).filter(
    (permission) =>
      permission !== "admins" &&
      permission !== "system" &&
      permission !== "audit"
  );
  const account: AdminAccount = {
    id: `adm-${Date.now()}`,
    fullName: input.fullName.trim().slice(0, 100),
    email,
    title: input.title.trim().slice(0, 100),
    role: "admin",
    active: true,
    permissions: Array.from(new Set(["dashboard" as const, ...allowed])),
    createdAt: new Date().toISOString(),
  };
  write(ADMINS, [...accounts(), account]);
  write(CREDENTIALS, { ...credentials(), [email]: input.password });
  addAudit("Yangi admin yaratildi", account.email, current);
  return account;
}

export function updateAdminPermissions(id: string, permissions: AdminPermission[]) {
  const current = requireSuperAdmin();
  const target = accounts().find((item) => item.id === id);
  if (!target || target.role === "super_admin") throw new Error("FORBIDDEN");
  const safe = permissions.filter(
    (permission) =>
      permission !== "admins" &&
      permission !== "system" &&
      permission !== "audit"
  );
  const next = accounts().map((item) =>
    item.id === id
      ? { ...item, permissions: Array.from(new Set(["dashboard" as const, ...safe])) }
      : item
  );
  write(ADMINS, next);
  addAudit("Admin ruxsatlari yangilandi", id, current);
  return next;
}

export interface SystemSettings {
  maintenance: boolean;
  registration: boolean;
  paymentsPaused: boolean;
  commission: number;
}

export function getSystemSettings(): SystemSettings {
  return read<SystemSettings>(SYSTEM_SETTINGS, {
    maintenance: false,
    registration: true,
    paymentsPaused: false,
    commission: 10,
  });
}

export function saveSystemSettings(input: SystemSettings) {
  const current = requireSuperAdmin();
  if (!Number.isFinite(input.commission) || input.commission < 0 || input.commission > 30) {
    throw new Error("INVALID_COMMISSION");
  }
  write(SYSTEM_SETTINGS, { ...input, commission: Math.round(input.commission * 10) / 10 });
  addAudit("Tizim sozlamalari yangilandi", JSON.stringify(input), current);
}

export function revokeAllUserSessions() {
  const current = requireSuperAdmin();
  localStorage.removeItem("sb_session");
  addAudit("Barcha foydalanuvchi sessiyalari bekor qilindi", "global", current);
}

function requireSuperAdmin() {
  const current = getCurrentAdmin();
  if (!current || current.role !== "super_admin") throw new Error("FORBIDDEN");
  return current;
}

export function addAudit(action: string, target: string, actor = getCurrentAdmin()) {
  if (!actor) return;
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    adminId: actor.id,
    adminName: actor.fullName,
    action,
    target,
    createdAt: new Date().toISOString(),
  };
  write(AUDIT, [event, ...read<AuditEvent[]>(AUDIT, [])].slice(0, 500));
}

export function getAuditEvents() {
  return read<AuditEvent[]>(AUDIT, []);
}

function appData<T>(key: string, fallback: T): T {
  return read<T>(key, fallback);
}

export function getAdminData() {
  return {
    users: appData<User[]>("sb2_users", seedUsers),
    services: appData<Service[]>("sb2_services", seedServices),
    jobs: appData<Job[]>("sb2_jobs", seedJobs),
    contracts: appData<Contract[]>("sb2_contracts", seedContracts),
    verifications: appData<VerificationRecord[]>("sb2_verifications", []),
    disputes: appData<Dispute[]>("sb2_disputes", []),
    tickets: appData<SupportTicket[]>("sb2_support_tickets", []),
    blockedUserIds: appData<string[]>("sb2_blocked_users", []),
  };
}

export function adminModerate(
  kind: "users" | "kyc" | "disputes" | "support" | "content",
  id: string,
  options: { outcome?: "approve" | "reject"; note?: string } = {}
) {
  const actor = getCurrentAdmin();
  if (!actor) throw new Error("FORBIDDEN");
  const permission: Record<typeof kind, AdminPermission> = {
    users: "users", kyc: "kyc", disputes: "disputes", support: "support", content: "content",
  };
  if (!actor.permissions.includes(permission[kind])) throw new Error("FORBIDDEN");

  if (kind === "users") {
    const key = "sb2_blocked_users";
    const blocked = read<string[]>(key, []);
    const next = blocked.includes(id) ? blocked.filter((item) => item !== id) : [...blocked, id];
    write(key, next);
    addAudit(next.includes(id) ? "Foydalanuvchi bloklandi" : "Foydalanuvchi tiklandi", id, actor);
  } else if (kind === "kyc") {
    if (options.outcome === "reject" && (options.note?.trim().length ?? 0) < 10) {
      throw new Error("NOTE_REQUIRED");
    }
    const records = read<VerificationRecord[]>("sb2_verifications", []);
    write("sb2_verifications", records.map((item) =>
      item.userId === id
        ? options.outcome === "reject"
          ? { ...item, status: "rad_etilgan" as const, rejectionReason: options.note?.trim().slice(0, 500) }
          : { ...item, status: "tasdiqlangan" as const, rejectionReason: undefined }
        : item
    ));
    addAudit(options.outcome === "reject" ? "KYC rad etildi" : "KYC tasdiqlandi", id, actor);
  } else if (kind === "disputes") {
    if ((options.note?.trim().length ?? 0) < 10) throw new Error("NOTE_REQUIRED");
    const disputes = read<Dispute[]>("sb2_disputes", []);
    write("sb2_disputes", disputes.map((item) =>
      item.id === id ? { ...item, status: "hal_qilindi" as const } : item
    ));
    write("sb2_admin_case_notes", {
      ...read<Record<string, string>>("sb2_admin_case_notes", {}),
      [id]: options.note?.trim().slice(0, 1000) ?? "",
    });
    addAudit("Nizo hal qilindi", id, actor);
  } else if (kind === "support") {
    if ((options.note?.trim().length ?? 0) < 3) throw new Error("NOTE_REQUIRED");
    const tickets = read<SupportTicket[]>("sb2_support_tickets", []);
    write("sb2_support_tickets", tickets.map((item) =>
      item.id === id ? { ...item, status: "yopilgan" as const } : item
    ));
    write("sb2_admin_case_notes", {
      ...read<Record<string, string>>("sb2_admin_case_notes", {}),
      [id]: options.note?.trim().slice(0, 2000) ?? "",
    });
    addAudit("Yordam so‘rovi yopildi", id, actor);
  } else {
    const jobs = read<Job[]>("sb2_jobs", seedJobs);
    const job = jobs.find((item) => item.id === id);
    if (job) {
      write("sb2_jobs", jobs.map((item) =>
        item.id === id ? { ...item, status: item.status === "ochiq" ? "yopilgan" as const : "ochiq" as const } : item
      ));
    } else {
      const services = read<Service[]>("sb2_services", seedServices);
      write("sb2_services", services.map((item) =>
        item.id === id ? { ...item, status: item.status === "active" ? "paused" as const : "active" as const } : item
      ));
    }
    addAudit("Kontent holati o‘zgartirildi", id, actor);
  }
}
