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
  Review,
} from "@/lib/types";
import type {
  AdminAccount,
  AdminPermission,
  AdminSession,
  AuditEvent,
  WithdrawalRequest,
  TransactionRecord,
  TrustReport,
  UserAppeal,
  CategoryManagementItem,
  PlatformSettingItem,
  InternalNote,
  RefundRecord,
} from "@/lib/admin-types";
import {
  seedContracts,
  seedJobs,
  seedServices,
  seedUsers,
  seedMilestones,
  seedReviews,
} from "@/lib/mock-api/seed";
import {
  seedVerifications,
  seedDisputes,
  seedSupportTickets,
  seedWithdrawals,
  seedTransactions,
  seedTrustReports,
  seedUserAppeals,
  seedCategories,
  seedPlatformSettings,
  seedInternalNotes,
  seedAuditLog,
} from "@/lib/admin-mock-data";

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
  "dashboard",
  "users",
  "services",
  "jobs",
  "orders",
  "kyc",
  "disputes",
  "payments",
  "reports",
  "appeals",
  "reviews",
  "support",
  "categories",
  "settings",
  "audit",
  "admins",
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
    title: "Operations Administrator",
    active: true,
    permissions: [
      "dashboard",
      "users",
      "services",
      "jobs",
      "orders",
      "kyc",
      "disputes",
      "payments",
      "reports",
      "appeals",
      "reviews",
      "support",
      "categories",
      "audit",
    ],
    createdAt: "2026-05-12T09:00:00.000Z",
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function accounts(): AdminAccount[] {
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
  return session
    ? accounts().find((item) => item.id === session.adminId) ?? null
    : null;
}

export async function adminLogin(
  email: string,
  password: string,
  expectedRole?: AdminAccount["role"]
) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const normalized = email.trim().toLowerCase();
  const account = accounts().find(
    (item) => item.email === normalized && item.active
  );
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
    item.id === account.id
      ? { ...item, lastLoginAt: new Date().toISOString() }
      : item
  );
  write(ADMINS, next);
  addAudit("Tizimga kirdi", account.email, "Admin sessiyasi ochildi");
  return session;
}

export function adminLogout() {
  if (typeof window !== "undefined") localStorage.removeItem(ADMIN_SESSION);
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
  const next = accounts().map((item) =>
    item.id === id ? { ...item, active } : item
  );
  write(ADMINS, next);
  addAudit(
    active ? "Admin faollashtirildi" : "Admin bloklandi",
    id,
    `Admin statusi ${active ? "faol" : "nofaol"} qilindi`
  );
  return next;
}

export function addAdmin(
  input: Pick<AdminAccount, "fullName" | "email" | "title"> & {
    password: string;
    permissions?: AdminPermission[];
  }
) {
  requireSuperAdmin();
  const email = input.email.trim().toLowerCase();
  if (accounts().some((item) => item.email === email))
    throw new Error("DUPLICATE");
  if (
    input.password.length < 8 ||
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password)
  )
    throw new Error("WEAK_PASSWORD");

  const allowed = (
    input.permissions ?? [
      "dashboard",
      "users",
      "services",
      "jobs",
      "orders",
      "kyc",
      "disputes",
      "payments",
      "support",
    ]
  ).filter((permission) => permission !== "admins");

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
  addAudit("Yangi admin yaratildi", account.email, `Lavozim: ${account.title}`);
  return account;
}

function requireSuperAdmin() {
  const current = getCurrentAdmin();
  if (!current || current.role !== "super_admin") throw new Error("FORBIDDEN");
  return current;
}

export function addAudit(
  action: string,
  target: string,
  details?: string,
  previousState?: string,
  newState?: string
) {
  const actor = getCurrentAdmin();
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    adminId: actor?.id ?? "system",
    adminName: actor?.fullName ?? "Tizim",
    action,
    target,
    details,
    previousState,
    newState,
    createdAt: new Date().toISOString(),
  };
  write(AUDIT, [event, ...read<AuditEvent[]>(AUDIT, seedAuditLog)].slice(0, 500));
}

export function getAuditEvents(): AuditEvent[] {
  return read<AuditEvent[]>(AUDIT, seedAuditLog);
}

function appData<T>(key: string, fallback: T): T {
  return read<T>(key, fallback);
}

/* ==========================================================================
   MAIN DATA RETRIEVAL (Interconnected)
   ========================================================================== */
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
    write("sb2_support_tickets", seedSupportTickets);
    tickets = seedSupportTickets;
  }

  let verifications = read<VerificationRecord[]>("sb2_verifications", []);
  if (!verifications.length) {
    write("sb2_verifications", seedVerifications);
    verifications = seedVerifications;
  }

  let disputes = read<Dispute[]>("sb2_disputes", []);
  if (!disputes.length) {
    write("sb2_disputes", seedDisputes);
    disputes = seedDisputes;
  }

  let reports = read<TrustReport[]>("sb2_trust_reports", []);
  if (!reports.length) {
    write("sb2_trust_reports", seedTrustReports);
    reports = seedTrustReports;
  }

  let appeals = read<UserAppeal[]>("sb2_user_appeals", []);
  if (!appeals.length) {
    write("sb2_user_appeals", seedUserAppeals);
    appeals = seedUserAppeals;
  }

  let categories = read<CategoryManagementItem[]>("sb2_admin_categories", []);
  if (!categories.length) {
    write("sb2_admin_categories", seedCategories);
    categories = seedCategories;
  }

  let settings = read<PlatformSettingItem[]>("sb2_platform_settings", []);
  if (!settings.length) {
    write("sb2_platform_settings", seedPlatformSettings);
    settings = seedPlatformSettings;
  }

  let notes = read<InternalNote[]>("sb2_internal_notes", []);
  if (!notes.length) {
    write("sb2_internal_notes", seedInternalNotes);
    notes = seedInternalNotes;
  }

  const moderationDetails = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );

  const allUsers = appData<User[]>("sb2_users", seedUsers);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safeUsers = allUsers.map(({ password: _p, ...safe }) => safe);

  return {
    users: safeUsers as User[],
    services: appData<Service[]>("sb2_services", seedServices),
    jobs: appData<Job[]>("sb2_jobs", seedJobs),
    contracts: appData<Contract[]>("sb2_contracts", seedContracts),
    milestones: appData<Milestone[]>("sb2_milestones", seedMilestones),
    reviews: appData<Review[]>("sb2_reviews", seedReviews),
    verifications,
    disputes,
    tickets,
    reports,
    appeals,
    categories,
    settings,
    notes,
    blockedUserIds: appData<string[]>("sb2_blocked_users", ["u-block1"]),
    withdrawals,
    transactions,
    moderationDetails,
  };
}

/* ==========================================================================
   USER MODERATION & ENFORCEMENT
   ========================================================================== */
export function suspendUser(
  userId: string,
  reason: string,
  durationDays: number | null
) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  const details = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );
  const suspendedUntil = durationDays
    ? new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000
      ).toISOString()
    : undefined;
  details[userId] = {
    status: "suspended",
    reason,
    suspendedAt: new Date().toISOString(),
    suspendedUntil,
  };
  write("sb2_user_moderation_details", details);

  addAudit(
    "Foydalanuvchi to'xtatildi (Suspended)",
    userId,
    `Sabab: ${reason}. Muddat: ${durationDays ? `${durationDays} kun` : "Doimiy"}`
  );
}

export function unsuspendUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const blocked = read<string[]>("sb2_blocked_users", []);
  write(
    "sb2_blocked_users",
    blocked.filter((id) => id !== userId)
  );

  const details = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );
  details[userId] = {
    status: "active",
    resolvedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  addAudit("Foydalanuvchi tiklandi", userId, "Cheklov bekor qilindi");
}

export function blockUser(userId: string, reason: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  const details = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );
  details[userId] = {
    status: "blocked",
    reason,
    suspendedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  addAudit("Foydalanuvchi to'liq bloklandi", userId, `Sabab: ${reason}`);
}

export function deactivateUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const details = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );
  details[userId] = {
    status: "deactivated",
    deactivatedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  addAudit("Foydalanuvchi hisobi deaktivatsiya qilindi", userId);
}

export function softDeleteUser(userId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("users")) throw new Error("FORBIDDEN");

  const details = read<Record<string, UserModerationInfo>>(
    "sb2_user_moderation_details",
    {}
  );
  details[userId] = {
    status: "deleted",
    deletedAt: new Date().toISOString(),
  };
  write("sb2_user_moderation_details", details);

  const blocked = read<string[]>("sb2_blocked_users", []);
  if (!blocked.includes(userId)) {
    write("sb2_blocked_users", [...blocked, userId]);
  }

  addAudit("Foydalanuvchi hisobi o'chirildi (soft delete)", userId);
}

/* ==========================================================================
   KYC MODERATION
   ========================================================================== */
export function adminModerateKYC(
  userId: string,
  outcome: "approve" | "reject",
  reason?: string
) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("kyc")) throw new Error("FORBIDDEN");
  if (outcome === "reject" && (!reason || reason.trim().length < 5)) {
    throw new Error("REASON_REQUIRED");
  }

  const records = read<VerificationRecord[]>(
    "sb2_verifications",
    seedVerifications
  );
  const updated = records.map((item) =>
    item.userId === userId
      ? {
          ...item,
          status:
            outcome === "approve"
              ? ("tasdiqlangan" as const)
              : ("rad_etilgan" as const),
          verifiedAt: outcome === "approve" ? new Date().toISOString() : null,
          rejectionReason: outcome === "reject" ? reason?.trim() : null,
        }
      : item
  );
  write("sb2_verifications", updated);

  addAudit(
    outcome === "approve" ? "KYC Tasdiqlandi" : "KYC Rad etildi",
    userId,
    outcome === "reject" ? `Rad sababi: ${reason}` : "Hujjatlar qabul qilindi"
  );
}

/* ==========================================================================
   DISPUTE RESOLUTION
   ========================================================================== */
export function forceCloseContract(
  contractId: string,
  outcome: "refund" | "payout" | "split",
  notes: string,
  splitAmount?: number
) {
  const actor = getCurrentAdmin();
  if (
    !actor?.permissions.includes("disputes") &&
    !actor?.permissions.includes("payments")
  ) {
    throw new Error("FORBIDDEN");
  }

  const contracts = read<Contract[]>("sb2_contracts", seedContracts);
  const contractIdx = contracts.findIndex((c) => c.id === contractId);
  if (contractIdx === -1) throw new Error("NOT_FOUND");

  const contract = contracts[contractIdx];
  contracts[contractIdx].status =
    outcome === "refund" ? "bekor_qilingan" : "yakunlangan";
  write("sb2_contracts", contracts);

  const disputes = read<Dispute[]>("sb2_disputes", seedDisputes);
  write(
    "sb2_disputes",
    disputes.map((d) =>
      d.contractId === contractId
        ? {
            ...d,
            status: "hal_qilindi" as const,
            resolvedAt: new Date().toISOString(),
            resolution: `Arbitraj qarori (${outcome.toUpperCase()}): ${notes}`,
          }
        : d
    )
  );

  const milestones = read<Milestone[]>("sb2_milestones", seedMilestones);
  const updatedMilestones = milestones.map((m) => {
    if (m.contractId === contractId) {
      return {
        ...m,
        status:
          outcome === "refund"
            ? ("kutilmoqda" as const)
            : ("qabul_qilindi" as const),
      };
    }
    return m;
  });
  write("sb2_milestones", updatedMilestones);

  if (outcome === "refund" || outcome === "split") {
    const refundAmount =
      outcome === "split" ? splitAmount ?? 0 : contract.totalAmount;
    const refunds = read<RefundRecord[]>("sb2_refunds", []);
    const newRefund: RefundRecord = {
      id: `ref-${Date.now()}`,
      contractId: contract.id,
      contractTitle: contract.title,
      buyerId: contract.buyerId,
      buyerName: contract.buyerName,
      specialistId: contract.sellerId,
      specialistName: contract.sellerName,
      totalAmount: contract.totalAmount,
      refundAmount,
      reason: notes,
      status: "completed",
      processedBy: actor.fullName,
      createdAt: new Date().toISOString(),
    };
    write("sb2_refunds", [newRefund, ...refunds]);
  }

  addAudit(
    `Nizo hal qilindi (${outcome})`,
    contractId,
    `Qaror: ${notes}. Summa: ${outcome === "split" ? `${splitAmount} UZS qaytarildi` : "To'liq"}`
  );
}

/* ==========================================================================
   SUPPORT HELP DESK
   ========================================================================== */
export function replyToTicket(
  ticketId: string,
  replyText: string,
  newStatus?: SupportTicket["status"]
) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("support")) throw new Error("FORBIDDEN");
  if (replyText.trim().length < 2) throw new Error("REPLY_REQUIRED");

  const tickets = read<SupportTicket[]>(
    "sb2_support_tickets",
    seedSupportTickets
  );
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) throw new Error("NOT_FOUND");

  tickets[idx] = {
    ...tickets[idx],
    status: newStatus ?? "javob_berildi",
  };
  write("sb2_support_tickets", tickets);

  const chatKey = `sb2_ticket_chat_${ticketId}`;
  const conversation = read<
    { sender: string; text: string; at: string; isAdmin: boolean }[]
  >(chatKey, []);
  conversation.push({
    sender: actor.fullName,
    text: replyText.trim(),
    at: new Date().toISOString(),
    isAdmin: true,
  });
  write(chatKey, conversation);

  addAudit("Yordam chiptasiga javob berildi", ticketId, replyText.slice(0, 100));
}

export function closeTicket(ticketId: string, note?: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("support")) throw new Error("FORBIDDEN");

  const tickets = read<SupportTicket[]>(
    "sb2_support_tickets",
    seedSupportTickets
  );
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) throw new Error("NOT_FOUND");

  tickets[idx] = {
    ...tickets[idx],
    status: "yopilgan",
  };
  write("sb2_support_tickets", tickets);

  if (note) {
    addInternalNote(ticketId, "ticket", `Chipta yopildi: ${note}`);
  }

  addAudit("Yordam chiptasi yopildi", ticketId, note ?? "Hal qilindi");
}

/* ==========================================================================
   FINANCIAL & WITHDRAWAL OPERATIONS
   ========================================================================== */
export function approveWithdrawal(requestId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>(
    "sb2_withdrawal_requests",
    seedWithdrawals
  );
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");

  const req = withdrawals[reqIndex];
  withdrawals[reqIndex] = {
    ...req,
    status: "tasdiqlangan",
    processedAt: new Date().toISOString(),
    processedBy: actor.fullName,
  };
  write("sb2_withdrawal_requests", withdrawals);

  const transactions = read<TransactionRecord[]>(
    "sb2_transactions",
    seedTransactions
  );
  const tx: TransactionRecord = {
    id: `tx-${Date.now()}`,
    type: "yechish",
    userId: req.userId,
    userName: req.userName,
    amount: req.amount,
    currency: "UZS",
    referenceId: req.id,
    description: `${req.cardDetails} kartasiga mablag' yechib olindi`,
    status: "muvaffaqiyatli",
    createdAt: new Date().toISOString(),
  };
  write("sb2_transactions", [tx, ...transactions]);

  addAudit("Pul yechish tasdiqlandi", req.id, `${req.amount} UZS o'tkazildi`);
}

export function rejectWithdrawal(requestId: string, reason: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>(
    "sb2_withdrawal_requests",
    seedWithdrawals
  );
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");

  const req = withdrawals[reqIndex];
  withdrawals[reqIndex] = {
    ...req,
    status: "rad_etilgan",
    processedAt: new Date().toISOString(),
    processedBy: actor.fullName,
    rejectionReason: reason,
  };
  write("sb2_withdrawal_requests", withdrawals);

  addAudit("Pul yechish rad etildi", req.id, `Sabab: ${reason}`);
}

export function reviewWithdrawal(requestId: string) {
  const actor = getCurrentAdmin();
  if (!actor?.permissions.includes("payments")) throw new Error("FORBIDDEN");

  const withdrawals = read<WithdrawalRequest[]>(
    "sb2_withdrawal_requests",
    seedWithdrawals
  );
  const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
  if (reqIndex === -1) throw new Error("NOT_FOUND");

  withdrawals[reqIndex].status = "korib_chiqilmoqda";
  write("sb2_withdrawal_requests", withdrawals);

  addAudit("Pul yechish ko'rib chiqishga olindi", requestId, "Status: korib_chiqilmoqda");
}

export function adminModerate(
  kind: "users" | "kyc" | "disputes" | "support",
  id: string,
  options: { outcome?: "approve" | "reject"; note?: string } = {}
) {
  if (kind === "kyc") {
    adminModerateKYC(id, options.outcome ?? "approve", options.note);
  } else if (kind === "users") {
    if (options.outcome === "reject") {
      blockUser(id, options.note ?? "Admin qarori bilan");
    } else {
      unsuspendUser(id);
    }
  } else if (kind === "disputes") {
    forceCloseContract(id, "refund", options.note ?? "Admin arbitraji");
  } else if (kind === "support") {
    closeTicket(id, options.note);
  }
}

/* ==========================================================================
   TRUST & SAFETY REPORTS
   ========================================================================== */
export function updateTrustReport(
  reportId: string,
  action: "investigating" | "resolved" | "dismissed",
  note: string,
  userAction?: "none" | "warned" | "restricted" | "suspended" | "removed"
) {
  const actor = getCurrentAdmin();
  if (!actor) throw new Error("FORBIDDEN");

  const reports = read<TrustReport[]>("sb2_trust_reports", seedTrustReports);
  const updated = reports.map((r) =>
    r.id === reportId
      ? {
          ...r,
          status: action,
          assignedAdminId: actor.id,
          assignedAdminName: actor.fullName,
          resolutionNote: note,
          actionTaken: userAction ?? r.actionTaken,
          resolvedAt:
            action === "resolved" || action === "dismissed"
              ? new Date().toISOString()
              : r.resolvedAt,
        }
      : r
  );
  write("sb2_trust_reports", updated);

  addAudit(
    `Shikoyat ko'rib chiqildi (${action})`,
    reportId,
    `Qaror: ${note}`
  );
}

/* ==========================================================================
   USER APPEALS
   ========================================================================== */
export function handleUserAppeal(
  appealId: string,
  decision: "accepted" | "rejected",
  note: string
) {
  const actor = getCurrentAdmin();
  if (!actor) throw new Error("FORBIDDEN");

  const appeals = read<UserAppeal[]>("sb2_user_appeals", seedUserAppeals);
  const appeal = appeals.find((a) => a.id === appealId);
  if (!appeal) throw new Error("NOT_FOUND");

  write(
    "sb2_user_appeals",
    appeals.map((a) =>
      a.id === appealId
        ? {
            ...a,
            status: decision,
            reviewerId: actor.id,
            reviewerName: actor.fullName,
            decisionNote: note,
            resolvedAt: new Date().toISOString(),
          }
        : a
    )
  );

  if (decision === "accepted") {
    unsuspendUser(appeal.userId);
  }

  addAudit(
    `Apellyatsiya ${decision === "accepted" ? "qabul qilindi" : "rad etildi"}`,
    appeal.userId,
    `Izoh: ${note}`
  );
}

/* ==========================================================================
   INTERNAL OPERATOR NOTES
   ========================================================================== */
export function getInternalNotes(targetId: string): InternalNote[] {
  const allNotes = read<InternalNote[]>("sb2_internal_notes", seedInternalNotes);
  return allNotes.filter((n) => n.targetId === targetId);
}

export function addInternalNote(
  targetId: string,
  targetType: InternalNote["targetType"],
  text: string
) {
  const actor = getCurrentAdmin();
  const newNote: InternalNote = {
    id: `note-${Date.now()}`,
    targetId,
    targetType,
    adminId: actor?.id ?? "adm-ops",
    adminName: actor?.fullName ?? "Operatsion Admin",
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  const allNotes = read<InternalNote[]>("sb2_internal_notes", seedInternalNotes);
  write("sb2_internal_notes", [newNote, ...allNotes]);
  return newNote;
}

/* ==========================================================================
   CATEGORIES MANAGEMENT
   ========================================================================== */
export function saveCategory(category: CategoryManagementItem) {
  const actor = getCurrentAdmin();
  if (!actor) throw new Error("FORBIDDEN");

  const categories = read<CategoryManagementItem[]>(
    "sb2_admin_categories",
    seedCategories
  );
  const idx = categories.findIndex((c) => c.id === category.id);
  let next: CategoryManagementItem[];
  if (idx >= 0) {
    next = categories.map((c) => (c.id === category.id ? category : c));
  } else {
    next = [...categories, category];
  }
  write("sb2_admin_categories", next);
  addAudit("Kategoriya yangilandi", category.nameUz, `Slug: ${category.slug}`);
  return next;
}

export function toggleCategoryActive(categoryId: string) {
  const categories = read<CategoryManagementItem[]>(
    "sb2_admin_categories",
    seedCategories
  );
  const updated = categories.map((c) =>
    c.id === categoryId ? { ...c, active: !c.active } : c
  );
  write("sb2_admin_categories", updated);
  return updated;
}

/* ==========================================================================
   PLATFORM SETTINGS
   ========================================================================== */
export function updatePlatformSetting(key: string, value: string | number | boolean) {
  requireSuperAdmin();
  const settings = read<PlatformSettingItem[]>(
    "sb2_platform_settings",
    seedPlatformSettings
  );
  const updated = settings.map((s) => (s.key === key ? { ...s, value } : s));
  write("sb2_platform_settings", updated);
  addAudit("Platforma parametri o'zgartirildi", key, `Yangi qiymat: ${value}`);
  return updated;
}

/* ==========================================================================
   GLOBAL SEARCH (Across All Marketplace Domains)
   ========================================================================== */
export interface SearchResultItem {
  id: string;
  type:
    | "user"
    | "order"
    | "service"
    | "job"
    | "ticket"
    | "dispute"
    | "kyc"
    | "report";
  title: string;
  subtitle: string;
  url: string;
  badgeTone?: "primary" | "success" | "warning" | "danger" | "neutral";
}

export function adminGlobalSearch(query: string): SearchResultItem[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const data = getAdminData();
  const results: SearchResultItem[] = [];

  // 1. Users
  data.users.forEach((u) => {
    if (
      u.fullName.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    ) {
      results.push({
        id: u.id,
        type: "user",
        title: u.fullName,
        subtitle: `${u.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"} · ${u.phone}`,
        url: `/admin/foydalanuvchilar?userId=${u.id}`,
        badgeTone: u.role === "mutaxassis" ? "primary" : "neutral",
      });
    }
  });

  // 2. Contracts / Orders
  data.contracts.forEach((c) => {
    if (
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.buyerName.toLowerCase().includes(q) ||
      c.sellerName.toLowerCase().includes(q)
    ) {
      results.push({
        id: c.id,
        type: "order",
        title: `Shartnoma #${c.id}: ${c.title}`,
        subtitle: `${c.buyerName} → ${c.sellerName} · ${c.status}`,
        url: `/admin/shartnomalar?orderId=${c.id}`,
        badgeTone: "success",
      });
    }
  });

  // 3. KYC Applications
  data.verifications.forEach((k) => {
    if (
      k.legalName.toLowerCase().includes(q) ||
      k.userId.toLowerCase().includes(q)
    ) {
      results.push({
        id: k.userId,
        type: "kyc",
        title: `KYC: ${k.legalName}`,
        subtitle: `${k.documentType.toUpperCase()} (${k.country}) · ${k.status}`,
        url: `/admin/verifikatsiya?userId=${k.userId}`,
        badgeTone: "warning",
      });
    }
  });

  // 4. Disputes
  data.disputes.forEach((d) => {
    if (
      d.id.toLowerCase().includes(q) ||
      d.contractId.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
    ) {
      results.push({
        id: d.id,
        type: "dispute",
        title: `Nizo #${d.id}`,
        subtitle: `Shartnoma #${d.contractId}: ${d.description.slice(0, 50)}...`,
        url: `/admin/nizolar?disputeId=${d.id}`,
        badgeTone: "danger",
      });
    }
  });

  // 5. Support Tickets
  data.tickets.forEach((t) => {
    if (
      t.subject.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q)
    ) {
      results.push({
        id: t.id,
        type: "ticket",
        title: `Chipta #${t.id}: ${t.subject}`,
        subtitle: `Mavzu: ${t.topic} · Status: ${t.status}`,
        url: `/admin/yordam?ticketId=${t.id}`,
        badgeTone: "primary",
      });
    }
  });

  // 6. Services & Jobs
  data.services.forEach((s) => {
    if (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    ) {
      results.push({
        id: s.id,
        type: "service",
        title: `Xizmat: ${s.title}`,
        subtitle: `${s.category} · ${s.price} UZS`,
        url: `/admin/xizmatlar?serviceId=${s.id}`,
        badgeTone: "neutral",
      });
    }
  });

  return results.slice(0, 15);
}



