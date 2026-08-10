"use client";

import type {
  Contract,
  Dispute,
  Job,
  Service,
  SupportTicket,
  User,
  VerificationRecord,
  Milestone,
} from "@/lib/types";
import type {
  AdminAccount,
  AdminPermission,
  AdminSession,
  AuditEvent,
  WithdrawalRequest,
  TransactionRecord,
} from "@/lib/admin-types";
import {
  seedContracts,
  seedJobs,
  seedServices,
  seedUsers,
} from "@/lib/mock-api/seed";


interface UserModerationInfo {
  status: string;
  reason?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  deactivatedAt?: string;
  deletedAt?: string;
  resolvedAt?: string;
}

const ADMIN_SESSION = "sb2_admin_session";
const ADMINS = "sb2_admin_accounts";
const AUDIT = "sb2_admin_audit";
const CREDENTIALS = "sb2_admin_credentials";

const allPermissions: AdminPermission[] = [
  "dashboard", "users", "kyc", "disputes", "payments", "support", "admins",
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
      "dashboard", "users", "kyc", "disputes", "payments", "support",
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
    "dashboard", "users", "kyc", "disputes", "payments", "support",
  ]).filter((permission) => permission !== "admins");
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

const seedWithdrawals: WithdrawalRequest[] = [];

const seedTransactions: TransactionRecord[] = [];
const seedTickets: SupportTicket[] = [];

export function getAdminData() {
  let withdrawals = read<WithdrawalRequest[]>("sb2_withdrawal_requests", []);
  if (!withdrawals.length) {
    write("sb2_withdrawal_requests", seedWithdrawals);
    withdrawals = seedWithdrawals;
  }

  let transactions = read<TransactionRecord[]>("sb2_transactions", []);
  if (!transactions.length) {
    write("sb2_transactions", seedTransactions);
    transactions = seedTransactions;
  }

  let tickets = read<SupportTicket[]>("sb2_support_tickets", []);
  if (!tickets.length) {
    write("sb2_support_tickets", seedTickets);
    tickets = seedTickets;
  }

  const moderationDetails = read<Record<string, { status: string; reason?: string; suspendedUntil?: string; suspendedAt?: string; deactivatedAt?: string; deletedAt?: string }>>("sb2_user_moderation_details", {});

  const allUsers = appData<User[]>("sb2_users", seedUsers);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safeUsers = allUsers.map(({ password: _password, ...safe }) => safe);

  return {
    users: safeUsers as User[],
    services: appData<Service[]>("sb2_services", seedServices),
    jobs: appData<Job[]>("sb2_jobs", seedJobs),
    contracts: appData<Contract[]>("sb2_contracts", seedContracts),
    verifications: appData<VerificationRecord[]>("sb2_verifications", []),
    disputes: appData<Dispute[]>("sb2_disputes", []),
    tickets,
    blockedUserIds: appData<string[]>("sb2_blocked_users", []),
    withdrawals,
    transactions,
    moderationDetails,
  };
}

export function adminModerate(
  kind: "users" | "kyc" | "disputes" | "support",
  id: string,
  options: { outcome?: "approve" | "reject"; note?: string } = {}
) {
  const actor = getCurrentAdmin();
  if (!actor) throw new Error("FORBIDDEN");
  const permission: Record<typeof kind, AdminPermission> = {
    users: "users", kyc: "kyc", disputes: "disputes", support: "support",
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

export function suspendUser(userId: string, reason: string, durationDays: number | null) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");
  
  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  const details = read<Record<string, UserModerationInfo>>("sb2_user_moderation_details", {});
  const suspendedUntil = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : undefined;
  details[userId] = {
    status: "suspended",
    reason,
    suspendedAt: new Date().toISOString(),
    suspendedUntil,
  };
  write("sb2_user_moderation_details", details);

  addAudit(`Foydalanuvchi vaqtincha bloklandi: ${reason}`, userId, actor);
}

export function unsuspendUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");
  
  const blocked = read<string[]>("sb2_blocked_users", []);
  write("sb2_blocked_users", blocked.filter((id) => id !== userId));

  const details = read<Record<string, UserModerationInfo>>("sb2_user_moderation_details", {});
  details[userId] = {
    status: "active",
    resolvedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  addAudit(`Foydalanuvchi blokdan chiqarildi`, userId, actor);
}

export function deactivateUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const details = read<Record<string, UserModerationInfo>>("sb2_user_moderation_details", {});
  details[userId] = {
    status: "deactivated",
    deactivatedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  addAudit(`Foydalanuvchi hisobi deaktivatsiya qilindi`, userId, actor);
}

export function softDeleteUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const details = read<Record<string, UserModerationInfo>>("sb2_user_moderation_details", {});
  details[userId] = {
    status: "deleted",
    deletedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  const profiles = read<Record<string, { available: boolean }>>("sb2_profiles", {});
  if (profiles[userId]) {
    profiles[userId].available = false;
    write("sb2_profiles", profiles);
  }

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  addAudit(`Foydalanuvchi hisobi o'chirildi (soft delete)`, userId, actor);
}

export function approveWithdrawal(requestId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>("sb2_withdrawal_requests", []);
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");
  if (withdrawals[reqIndex].status !== "kutilmoqda" && withdrawals[reqIndex].status !== "korib_chiqilmoqda") {
    throw new Error("INVALID_STATE");
  }

  const req = withdrawals[reqIndex];
  withdrawals[reqIndex] = {
    ...req,
    status: "tasdiqlangan",
    processedAt: new Date().toISOString(),
    processedBy: actor.fullName,
  };
  write("sb2_withdrawal_requests", withdrawals);

  const transactions = read<TransactionRecord[]>("sb2_transactions", []);
  const tx: TransactionRecord = {
    id: `tx-${Date.now()}`,
    type: "yechish",
    userId: req.userId,
    userName: req.userName,
    amount: req.amount,
    currency: "UZS",
    referenceId: req.id,
    description: `${req.cardDetails} kartasiga mablag' yechib olindi (tasdiqlangan)`,
    createdAt: new Date().toISOString(),
  };
  write("sb2_transactions", [tx, ...transactions]);

  addAudit(`Withdrawal approved`, req.id, actor);
}

export function rejectWithdrawal(requestId: string, reason: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>("sb2_withdrawal_requests", []);
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");
  if (withdrawals[reqIndex].status !== "kutilmoqda" && withdrawals[reqIndex].status !== "korib_chiqilmoqda") {
    throw new Error("INVALID_STATE");
  }

  const req = withdrawals[reqIndex];
  withdrawals[reqIndex] = {
    ...req,
    status: "rad_etilgan",
    processedAt: new Date().toISOString(),
    processedBy: actor.fullName,
    rejectionReason: reason,
  };
  write("sb2_withdrawal_requests", withdrawals);

  if (req.userRole === "xaridor") {
    const balances = read<Record<string, number>>("sb2_balances", {});
    balances[req.userId] = (balances[req.userId] ?? 0) + req.amount;
    write("sb2_balances", balances);
  } else {
    const withdrawn = read<Record<string, number>>("sb2_withdrawn", {});
    if (withdrawn[req.userId]) {
      withdrawn[req.userId] = Math.max(0, withdrawn[req.userId] - req.amount);
      write("sb2_withdrawn", withdrawn);
    }
  }

  addAudit(`Withdrawal rejected: ${reason}`, req.id, actor);
}

export function reviewWithdrawal(requestId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>("sb2_withdrawal_requests", []);
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");

  withdrawals[reqIndex].status = "korib_chiqilmoqda";
  write("sb2_withdrawal_requests", withdrawals);

  addAudit(`Withdrawal marked under review`, requestId, actor);
}

export function forceCloseContract(contractId: string, outcome: "refund" | "payout" | "split", notes: string, splitAmount?: number) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("disputes") && !actor?.permissions.includes("payments")) {
    throw new Error("FORBIDDEN");
  }

  const contracts = read<Contract[]>("sb2_contracts", []);
  const contractIdx = contracts.findIndex((c) => c.id === contractId);
  if (contractIdx === -1) throw new Error("NOT_FOUND");

  const contract = contracts[contractIdx];
  contracts[contractIdx].status = outcome === "refund" ? "bekor_qilingan" as const : "yakunlangan" as const;
  write("sb2_contracts", contracts);

  const milestones = read<Milestone[]>("sb2_milestones", []);
  const contractMilestones = milestones.filter((m) => m.contractId === contractId);
  
  const updatedMilestones = milestones.map((m) => {
    if (m.contractId === contractId) {
      if (outcome === "refund") {
        return { ...m, status: "kutilmoqda" as const };
      } else if (outcome === "payout") {
        return { ...m, status: "qabul_qilindi" as const };
      } else {
        return { ...m, status: "qabul_qilindi" as const };
      }
    }
    return m;
  });
  write("sb2_milestones", updatedMilestones);

  const totalFunds = contractMilestones
    .filter((m) => m.status === "mablaglangan" || m.status === "topshirildi" || m.status === "ozgartirish_soraldi" || m.status === "qabul_qilindi")
    .reduce((sum, m) => sum + m.amount, 0);

  if (outcome === "refund") {
    const balances = read<Record<string, number>>("sb2_balances", {});
    balances[contract.buyerId] = (balances[contract.buyerId] ?? 0) + totalFunds;
    write("sb2_balances", balances);

    addAudit(`Contract force refunded to buyer`, contractId, actor);
  } else if (outcome === "payout") {
    addAudit(`Contract force released to specialist`, contractId, actor);
  } else if (outcome === "split") {
    const refundToBuyer = splitAmount ?? 0;
    const payoutToSpecialist = Math.max(0, totalFunds - refundToBuyer);

    const balances = read<Record<string, number>>("sb2_balances", {});
    balances[contract.buyerId] = (balances[contract.buyerId] ?? 0) + refundToBuyer;
    write("sb2_balances", balances);

    let remainingSpecialistAmount = payoutToSpecialist;
    const adjustedMilestones = updatedMilestones.map((m) => {
      if (m.contractId === contractId) {
        if (remainingSpecialistAmount >= m.amount) {
          remainingSpecialistAmount -= m.amount;
          return { ...m, status: "qabul_qilindi" as const };
        } else {
          const newAmt = remainingSpecialistAmount;
          remainingSpecialistAmount = 0;
          return { ...m, amount: newAmt, status: newAmt > 0 ? "qabul_qilindi" as const : "kutilmoqda" as const };
        }
      }
      return m;
    });
    write("sb2_milestones", adjustedMilestones);

    addAudit(`Contract split-resolved: Buyer refund=${refundToBuyer}, Specialist payout=${payoutToSpecialist}`, contractId, actor);
  }

  const caseNotes = read<Record<string, string>>("sb2_admin_case_notes", {});
  caseNotes[contractId] = `FORCE CLOSE (${outcome.toUpperCase()}): ${notes}`;
  write("sb2_admin_case_notes", caseNotes);
}

export function replyToTicket(ticketId: string, replyText: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("support")) throw new Error("FORBIDDEN");

  if (replyText.trim().length < 3) throw new Error("REPLY_REQUIRED");

  const tickets = read<SupportTicket[]>("sb2_support_tickets", []);
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) throw new Error("NOT_FOUND");

  tickets[idx] = {
    ...tickets[idx],
    status: "javob_berildi" as const,
  };
  write("sb2_support_tickets", tickets);

  // Append response to conversation log
  const chatKey = `sb2_ticket_chat_${ticketId}`;
  const conversation = read<{ sender: string; text: string; at: string }[]>(chatKey, []);
  conversation.push({
    sender: actor.fullName,
    text: replyText.trim(),
    at: new Date().toISOString(),
  });
  write(chatKey, conversation);

  addAudit(`Yordam so'roviga javob yuborildi`, ticketId, actor);
}


