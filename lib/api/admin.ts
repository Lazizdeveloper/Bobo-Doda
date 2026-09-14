/**
 * Admin chegarasi — `app/admin/**` va `components/admin/**` FAQAT shu
 * moduldan import qiladi.
 *
 * Bosqich 17 — STAFF AUTENTIFIKATSIYASI REAL (`staff/auth/*`, `staff/me/*`):
 * login (parol + shartli TOTP), `mustChangePassword` qattiq darvoza,
 * TOTP enroll/verify/disable, sessiya ro'yxati, logout. Session/ruxsat
 * snapshot'i (`getAdminSession`/`getCurrentAdmin`/`hasPermission`) ilova
 * tomonidagi `authService.getSession()` bilan BIR XIL qoida — sinxron,
 * brauzerdagi snapshot, haqiqiy tekshiruv har so'rovda serverda.
 *
 * QOLGAN operatsiyalar (foydalanuvchi/xizmat/shartnoma/to'lov navbatlari,
 * moderatsiya, KYC, ticketlar, B2B va h.k.) — real backend DTO shakli
 * mock `AdminUserRow`/`AdminData` dan TUBDAN farq qiladi (masalan
 * `roles[]` va agregat hisoblagichlar, nested massivlar EMAS). Bularni
 * "faqat shu faylni almashtirish" bilan hal qilib bo'lmaydi — har bir
 * admin SAHIFASINI ham qayta yozish kerak (buyer/seller tomon bilan bir
 * xil hajmda, alohida bosqich). Shuning uchun ATAYLAB `FEATURE_DISABLED`
 * tashlaydi — mavjud sahifalar `loadError`/`<ErrorState>` konvensiyasi
 * orqali xavfsiz ko'rinadi, SOXTA (localStorage) ma'lumot ko'rsatilmaydi.
 */
import { normalizeApiError } from "./errors";
import type * as adminMock from "@/lib/admin-api";
import {
  bootstrapStaffSession,
  decodeStaffJwtSub,
  roleToLower,
  setStaffAccessToken,
  staffAccountStore,
  staffHttp,
  staffSessionStore,
  staffToQuery,
} from "./staff-http";
import type { AdminAccount, AdminPermission, AdminRole, AdminSession } from "@/lib/admin-types";

bootstrapStaffSession();

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- arity kerak, `Asyncified<typeof adminMock.X>` bilan mos kelishi uchun
function disabledAsync<T = never>(..._args: unknown[]): Promise<T> {
  return Promise.reject(new Error("FEATURE_DISABLED"));
}

/**
 * Eski admin.ts HAMMA mock funksiyani (sinxron bo'lsa ham) `asyncGuard`
 * bilan async chegara amaliga o'rar edi (bo'lim — "backend'da har bir
 * o'qish HTTP so'rov"). Shu shartnomani saqlash uchun: `typeof adminMock.X`
 * qanday bo'lishidan qat'i nazar, bu yerda HAR DOIM Promise qaytaruvchi
 * tur kerak.
 */
type Asyncified<F> = F extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;

/* ---------------- Sessiya va huquq (SINXRON snapshot) ---------------- */
export function getAdminSession(): AdminSession | null {
  return staffSessionStore.read();
}
export function getCurrentAdmin(): AdminAccount | null {
  return staffAccountStore.read();
}
export function hasPermission(permission: AdminPermission): boolean {
  return getCurrentAdmin()?.permissions.includes(permission) ?? false;
}
export function adminLogout(): void {
  void staffHttp("/staff/auth/logout", { method: "POST" }, false).catch(() => {});
  setStaffAccessToken(null);
  staffSessionStore.clear();
  staffAccountStore.clear();
}

interface StaffSessionResponse {
  accessToken: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}

function permissionsToLower(permissions: string[]): AdminPermission[] {
  return permissions.map((p) => (p === "STAFF" ? "admins" : p.toLowerCase())) as AdminPermission[];
}

async function applySession(res: StaffSessionResponse): Promise<AdminAccount> {
  setStaffAccessToken(res.accessToken);
  const session: AdminSession = {
    adminId: decodeStaffJwtSub(res.accessToken),
    role: roleToLower(res.role),
    expiresAt: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
  };
  staffSessionStore.write(session);
  const me = await staffHttp<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    title: string;
    permissions: string[];
    mfaEnabled: boolean;
    mustChangePassword: boolean;
  }>("/staff/me");
  const account: AdminAccount = {
    id: me.id,
    fullName: me.fullName,
    email: me.email,
    role: roleToLower(me.role),
    title: me.title,
    active: true,
    permissions: permissionsToLower(me.permissions),
    createdAt: "",
    mustChangePassword: me.mustChangePassword,
    mfaEnabled: me.mfaEnabled,
  };
  staffAccountStore.write(account);
  return account;
}

/**
 * Bosqich 17 — real login: `email`+`password`, 2FA yoqilgan hisoblarda
 * `totpCode` MAJBURIY (yo'q bo'lsa server `MFA_REQUIRED` qaytaradi —
 * chaqiruvchi UI shu kodni ushlab ikkinchi bosqichni ko'rsatadi).
 * Uchinchi `expectedRole` — FAQAT mijoz tomonidagi UX yo'naltirish
 * (masalan `/rahbariyat` portali faqat super_admin kutadi); haqiqiy
 * ruxsat HAR DOIM serverda (`StaffPermissionGuard`).
 */
export async function adminLogin(email: string, password: string, totpCode?: string, expectedRole?: AdminRole): Promise<AdminAccount> {
  try {
    const res = await staffHttp<StaffSessionResponse>("/staff/auth/login", {
      method: "POST",
      body: { email, password, totpCode },
    });
    const account = await applySession(res);
    if (expectedRole && account.role !== expectedRole) {
      adminLogout();
      throw new Error("FORBIDDEN");
    }
    return account;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function staffChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await staffHttp("/staff/me/change-password", { method: "POST", body: { currentPassword, newPassword } });
    const current = staffAccountStore.read();
    if (current) staffAccountStore.write({ ...current, mustChangePassword: false });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function staffEnrollTotp(): Promise<{ secret: string; otpauthUri: string }> {
  try {
    return await staffHttp("/staff/me/totp/enroll", { method: "POST" });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffVerifyTotp(totpCode: string): Promise<void> {
  try {
    await staffHttp("/staff/me/totp/verify", { method: "POST", body: { totpCode } });
    const current = staffAccountStore.read();
    if (current) staffAccountStore.write({ ...current, mfaEnabled: true });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffDisableTotp(currentPassword: string, totpCode: string): Promise<void> {
  try {
    await staffHttp("/staff/me/totp/disable", { method: "POST", body: { currentPassword, totpCode } });
    const current = staffAccountStore.read();
    if (current) staffAccountStore.write({ ...current, mfaEnabled: false });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export interface StaffSessionListItem {
  id: string;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  expiresAt: string;
}
export async function staffListOwnSessions(): Promise<StaffSessionListItem[]> {
  try {
    return await staffHttp("/staff/me/sessions");
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffRevokeOwnSession(id: string): Promise<void> {
  try {
    await staffHttp(`/staff/me/sessions/${id}`, { method: "DELETE" });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ==========================================================================
   PASTDAGI HAMMASI — Bosqich 17'da hali ko'chirilmagan (bo'lim boshidagi
   izohga qarang). ATAYLAB FEATURE_DISABLED: mavjud sahifalar xavfsiz
   `<ErrorState>` ko'rsatadi, mock ma'lumot ishlatilmaydi.
   ========================================================================== */
export const getAdminAccounts: Asyncified<typeof adminMock.getAdminAccounts> = disabledAsync;
export const setAdminActive: Asyncified<typeof adminMock.setAdminActive> = disabledAsync;
export const addAdmin: Asyncified<typeof adminMock.addAdmin> = disabledAsync;
export const updateAdminAccount: Asyncified<typeof adminMock.updateAdminAccount> = disabledAsync;

export const getAdminData: Asyncified<typeof adminMock.getAdminData> = disabledAsync;
export const getAuditEvents: Asyncified<typeof adminMock.getAuditEvents> = disabledAsync;
export const getInternalNotes: Asyncified<typeof adminMock.getInternalNotes> = disabledAsync;
export const getTicketConversation: Asyncified<typeof adminMock.getTicketConversation> = disabledAsync;
export const adminGlobalSearch: Asyncified<typeof adminMock.adminGlobalSearch> = disabledAsync;

export const listUsersQueue: Asyncified<typeof adminMock.listUsersQueue> = disabledAsync;
export const listServicesQueue: Asyncified<typeof adminMock.listServicesQueue> = disabledAsync;
export const listJobsQueue: Asyncified<typeof adminMock.listJobsQueue> = disabledAsync;
export const listContractsQueue: Asyncified<typeof adminMock.listContractsQueue> = disabledAsync;
export const listVerificationsQueue: Asyncified<typeof adminMock.listVerificationsQueue> = disabledAsync;
export const listDisputesQueue: Asyncified<typeof adminMock.listDisputesQueue> = disabledAsync;
export const listWithdrawalsQueue: Asyncified<typeof adminMock.listWithdrawalsQueue> = disabledAsync;
export const listTransactionsQueue: Asyncified<typeof adminMock.listTransactionsQueue> = disabledAsync;
export const listTicketsQueue: Asyncified<typeof adminMock.listTicketsQueue> = disabledAsync;
export const listReportsQueue: Asyncified<typeof adminMock.listReportsQueue> = disabledAsync;
export const listAppealsQueue: Asyncified<typeof adminMock.listAppealsQueue> = disabledAsync;
export const listReviewsQueue: Asyncified<typeof adminMock.listReviewsQueue> = disabledAsync;
export const listAuditQueue: Asyncified<typeof adminMock.listAuditQueue> = disabledAsync;

export async function getAdminCounters(): Promise<adminMock.AdminCounters> {
  /* Bo'lim 91-J — badge/KPI raqamlarining REAL, kam-xarajat manbasi:
     har navbatdan faqat `total` (perPage=1). Mock-only navbatlar (KYC,
     reports, tickets, appeals, withdrawals, jobs, reviews) 0 qoladi. */
  try {
    const [users, services, contracts, disputesOpen, disputesReview, audit] = await Promise.all([
      staffHttp<{ total: number }>("/staff/users?perPage=1"),
      staffHttp<{ total: number }>("/staff/services?perPage=1"),
      staffHttp<{ total: number }>("/staff/contracts?perPage=1"),
      staffHttp<{ total: number }>("/staff/disputes?status=OPEN&perPage=1"),
      staffHttp<{ total: number }>("/staff/disputes?status=UNDER_REVIEW&perPage=1"),
      staffHttp<{ total: number }>("/staff/audit-logs?perPage=1"),
    ]);
    return {
      pendingKyc: 0,
      openDisputes: disputesOpen.total + disputesReview.total,
      pendingWithdrawals: 0,
      openReports: 0,
      openTickets: 0,
      pendingAppeals: 0,
      totalUsers: users.total,
      totalServices: services.total,
      totalJobs: 0,
      totalContracts: contracts.total,
      totalReviews: 0,
      totalAuditEvents: audit.total,
      auditAdmins: [] as string[],
      escrowTotal: 0,
      payoutsTotal: 0,
      commissionTotal: 0,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ==========================================================================
   REAL — bo'lim 91-J tanlangan doira: Foydalanuvchilar, Nizolar, To'lovlar/
   Qaytarish/Chiqarish, Shartnomalar, Audit jurnali. Mock nomlari bilan
   TO'QNASHMASLIGI uchun ATAYLAB yangi `staff*` prefiksi bilan — tegishli
   sahifalar shu yangi funksiyalarni chaqiradi (eski mock-shaped nomlar
   yuqorida hamon FEATURE_DISABLED, boshqa hech qaysi sahifa ularga
   tegmaydi).
   ========================================================================== */
type Page<T> = { items: T[]; page: number; perPage: number; total: number; totalPages: number };

function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/* ---------------- Foydalanuvchilar (staff/users) ---------------- */
export interface StaffUserRow {
  id: string;
  phone: string;
  fullName?: string;
  email?: string;
  roles: string[];
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  sellerStatus: string;
  verified: boolean;
  createdAt: string;
}
export interface StaffUserDetail extends StaffUserRow {
  statusReason?: string;
  statusChangedAt?: string;
  suspendedUntil?: string;
  contractsAsBuyerCount: number;
  contractsAsSellerCount: number;
  paymentsCount: number;
}
function mapStaffUser(u: Record<string, unknown>): StaffUserRow {
  return {
    id: u.id as string,
    phone: u.phone as string,
    fullName: asStr(u.fullName),
    email: asStr(u.email),
    roles: u.roles as string[],
    status: u.status as StaffUserRow["status"],
    sellerStatus: u.sellerStatus as string,
    verified: u.verified as boolean,
    createdAt: u.createdAt as string,
  };
}
export async function staffListUsers(query: {
  page?: number;
  perPage?: number;
  phone?: string;
  status?: string;
  role?: string;
}): Promise<Page<StaffUserRow>> {
  try {
    const res = await staffHttp<Page<Record<string, unknown>>>(`/staff/users${staffToQuery(query)}`);
    return { ...res, items: res.items.map(mapStaffUser) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffGetUser(id: string): Promise<StaffUserDetail> {
  try {
    const u = await staffHttp<Record<string, unknown>>(`/staff/users/${id}`);
    return {
      ...mapStaffUser(u),
      statusReason: asStr(u.statusReason),
      statusChangedAt: asStr(u.statusChangedAt),
      suspendedUntil: asStr(u.suspendedUntil),
      contractsAsBuyerCount: u.contractsAsBuyerCount as number,
      contractsAsSellerCount: u.contractsAsSellerCount as number,
      paymentsCount: u.paymentsCount as number,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffSuspendUser(id: string, reason: string, suspendedUntil?: string): Promise<void> {
  try {
    await staffHttp(`/staff/users/${id}/suspend`, { method: "POST", body: { reason, suspendedUntil } });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffBlockUser(id: string, reason: string): Promise<void> {
  try {
    await staffHttp(`/staff/users/${id}/block`, { method: "POST", body: { reason } });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffReactivateUser(id: string): Promise<void> {
  try {
    await staffHttp(`/staff/users/${id}/reactivate`, { method: "POST" });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ---------------- Shartnomalar (staff/contracts) ---------------- */
export interface StaffMilestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  position: number;
  status: string;
  dueAt?: string;
  submittedAt?: string;
  approvedAt?: string;
}
export interface StaffContract {
  id: string;
  buyerId: string;
  sellerId: string;
  serviceId: string;
  serviceTitleSnapshot: string;
  sellerDisplayNameSnapshot: string;
  agreedAmount: number;
  currency: string;
  deadline: string;
  status: string;
  milestones: StaffMilestone[];
  createdAt: string;
}
function mapStaffMilestone(m: Record<string, unknown>): StaffMilestone {
  return {
    id: m.id as string,
    title: m.title as string,
    description: asStr(m.description),
    amount: m.amount as number,
    position: m.position as number,
    status: m.status as string,
    dueAt: asStr(m.dueAt),
    submittedAt: asStr(m.submittedAt),
    approvedAt: asStr(m.approvedAt),
  };
}
function mapStaffContract(c: Record<string, unknown>): StaffContract {
  return {
    id: c.id as string,
    buyerId: c.buyerId as string,
    sellerId: c.sellerId as string,
    serviceId: c.serviceId as string,
    serviceTitleSnapshot: c.serviceTitleSnapshot as string,
    sellerDisplayNameSnapshot: c.sellerDisplayNameSnapshot as string,
    agreedAmount: c.agreedAmount as number,
    currency: c.currency as string,
    deadline: c.deadline as string,
    status: c.status as string,
    milestones: ((c.milestones as Record<string, unknown>[]) ?? []).map(mapStaffMilestone),
    createdAt: c.createdAt as string,
  };
}
export async function staffListContracts(query: {
  page?: number;
  perPage?: number;
  status?: string;
  buyerId?: string;
  sellerId?: string;
}): Promise<Page<StaffContract>> {
  try {
    const res = await staffHttp<Page<Record<string, unknown>>>(`/staff/contracts${staffToQuery(query)}`);
    return { ...res, items: res.items.map(mapStaffContract) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffGetContract(id: string): Promise<StaffContract> {
  try {
    return mapStaffContract(await staffHttp(`/staff/contracts/${id}`));
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ---------------- Nizolar (staff/disputes) ---------------- */
export interface StaffDispute {
  id: string;
  contractId: string;
  reason: string;
  description: string;
  status: string;
  disputedAmount: number;
  heldAmount: number;
  currency: string;
  resolutionType?: string;
  buyerAwardAmount?: number;
  sellerAwardAmount?: number;
  resolutionReason?: string;
  openedByUserId: string;
  openedAt: string;
}
export interface StaffDisputeEvidence {
  id: string;
  type: string;
  text?: string;
  fileReference?: string;
  createdAt: string;
}
export interface StaffDisputeEvent {
  id: string;
  type: string;
  actorType: string;
  actorName: string;
  createdAt: string;
}
function mapStaffDispute(d: Record<string, unknown>): StaffDispute {
  return {
    id: d.id as string,
    contractId: d.contractId as string,
    reason: d.reason as string,
    description: d.description as string,
    status: d.status as string,
    disputedAmount: d.disputedAmount as number,
    heldAmount: d.heldAmount as number,
    currency: d.currency as string,
    resolutionType: asStr(d.resolutionType),
    buyerAwardAmount: typeof d.buyerAwardAmount === "number" ? d.buyerAwardAmount : undefined,
    sellerAwardAmount: typeof d.sellerAwardAmount === "number" ? d.sellerAwardAmount : undefined,
    resolutionReason: asStr(d.resolutionReason),
    openedByUserId: d.openedByUserId as string,
    openedAt: d.openedAt as string,
  };
}
export async function staffListDisputes(query: {
  page?: number;
  perPage?: number;
  status?: string;
  contractId?: string;
}): Promise<Page<StaffDispute>> {
  try {
    const res = await staffHttp<Page<Record<string, unknown>>>(`/staff/disputes${staffToQuery(query)}`);
    return { ...res, items: res.items.map(mapStaffDispute) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffGetDispute(id: string): Promise<StaffDispute> {
  try {
    return mapStaffDispute(await staffHttp(`/staff/disputes/${id}`));
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffListDisputeEvidence(id: string): Promise<StaffDisputeEvidence[]> {
  try {
    return await staffHttp(`/staff/disputes/${id}/evidence`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffListDisputeEvents(id: string): Promise<StaffDisputeEvent[]> {
  try {
    return await staffHttp(`/staff/disputes/${id}/events`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffStartDisputeReview(id: string): Promise<void> {
  try {
    await staffHttp(`/staff/disputes/${id}/start-review`, { method: "POST" });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffRejectDispute(id: string, resolutionReason: string): Promise<void> {
  try {
    await staffHttp(`/staff/disputes/${id}/reject`, { method: "POST", body: { resolutionReason } });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffResolveDispute(
  id: string,
  buyerAwardAmount: number,
  sellerAwardAmount: number,
  resolutionReason: string,
): Promise<void> {
  try {
    await staffHttp(`/staff/disputes/${id}/resolve`, {
      method: "POST",
      body: { buyerAwardAmount, sellerAwardAmount, resolutionReason },
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ---------------- To'lovlar / Qaytarish / Chiqarish ---------------- */
export interface StaffPayment {
  id: string;
  contractId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  payerUserId: string;
  createdAt: string;
}
export interface StaffRefund {
  id: string;
  contractId: string;
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
}
export interface StaffPayout {
  id: string;
  sellerId: string;
  status: string;
  amount: number;
  currency: string;
  destinationReference: string;
  createdAt: string;
}
export async function staffListPayments(query: { page?: number; perPage?: number; status?: string }): Promise<Page<StaffPayment>> {
  try {
    return await staffHttp(`/staff/payments${staffToQuery(query)}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffListRefunds(query: { page?: number; perPage?: number; status?: string }): Promise<Page<StaffRefund>> {
  try {
    return await staffHttp(`/staff/refunds${staffToQuery(query)}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffCreateRefund(contractId: string, reason: string): Promise<void> {
  try {
    await staffHttp(`/staff/refunds`, {
      method: "POST",
      body: { contractId, reason },
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffListPayouts(query: { page?: number; perPage?: number; status?: string }): Promise<Page<StaffPayout>> {
  try {
    return await staffHttp(`/staff/payouts${staffToQuery(query)}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ---------------- Ledger (staff/ledger/transactions) — append-only ---------------- */
export interface StaffLedgerEntry {
  id: string;
  accountType: string;
  accountOwnerType: string;
  accountOwnerId?: string;
  amount: number;
  currency: string;
}
export interface StaffLedgerTransaction {
  id: string;
  type: string;
  currency: string;
  sourceId: string;
  description?: string;
  entries: StaffLedgerEntry[];
  createdAt: string;
}
export async function staffListLedgerTransactions(query: { page?: number; perPage?: number; type?: string }): Promise<Page<StaffLedgerTransaction>> {
  try {
    return await staffHttp(`/staff/ledger/transactions${staffToQuery(query)}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/* ---------------- Audit jurnali (staff/audit-logs) ---------------- */
export interface StaffAuditLogRow {
  id: string;
  actorType: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
}
export async function staffListAuditLogs(query: {
  page?: number;
  perPage?: number;
  action?: string;
  resourceType?: string;
}): Promise<Page<StaffAuditLogRow>> {
  try {
    return await staffHttp(`/staff/audit-logs${staffToQuery(query)}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
export async function staffGetAuditLog(id: string): Promise<StaffAuditLogRow & { previousState?: unknown; newState?: unknown }> {
  try {
    return await staffHttp(`/staff/audit-logs/${id}`);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export const getContractMilestones: Asyncified<typeof adminMock.getContractMilestones> = disabledAsync;
export const getDisputeContext: Asyncified<typeof adminMock.getDisputeContext> = disabledAsync;
export const getUserDetail: Asyncified<typeof adminMock.getUserDetail> = disabledAsync;

export const findUserById: Asyncified<typeof adminMock.findUserById> = disabledAsync;
export const findServiceById: Asyncified<typeof adminMock.findServiceById> = disabledAsync;
export const findContractById: Asyncified<typeof adminMock.findContractById> = disabledAsync;
export const findJobById: Asyncified<typeof adminMock.findJobById> = disabledAsync;
export const findVerificationByUserId: Asyncified<typeof adminMock.findVerificationByUserId> = disabledAsync;
export const findTicketById: Asyncified<typeof adminMock.findTicketById> = disabledAsync;
export const findDisputeById: Asyncified<typeof adminMock.findDisputeById> = disabledAsync;

export type {
  AdminCounters,
  AdminData,
  AdminVerificationRow,
  AdminTicketRow,
  AdminDisputeRow,
  AdminUserRow,
} from "@/lib/admin-api";
export type { AdminQueueQuery, AdminPage } from "@/lib/admin-types";

export const suspendUser: Asyncified<typeof adminMock.suspendUser> = disabledAsync;
export const unsuspendUser: Asyncified<typeof adminMock.unsuspendUser> = disabledAsync;
export const blockUser: Asyncified<typeof adminMock.blockUser> = disabledAsync;
export const deactivateUser: Asyncified<typeof adminMock.deactivateUser> = disabledAsync;
export const softDeleteUser: Asyncified<typeof adminMock.softDeleteUser> = disabledAsync;
export const adminModerateKYC: Asyncified<typeof adminMock.adminModerateKYC> = disabledAsync;
export const adminModerate: Asyncified<typeof adminMock.adminModerate> = disabledAsync;

export const closeJobAsAdmin: Asyncified<typeof adminMock.closeJobAsAdmin> = disabledAsync;
export const setServiceStatus: Asyncified<typeof adminMock.setServiceStatus> = disabledAsync;
export const deleteReview: Asyncified<typeof adminMock.deleteReview> = disabledAsync;
export const updateTrustReport: Asyncified<typeof adminMock.updateTrustReport> = disabledAsync;
export const handleUserAppeal: Asyncified<typeof adminMock.handleUserAppeal> = disabledAsync;

export const forceCloseContract: Asyncified<typeof adminMock.forceCloseContract> = disabledAsync;

export const replyToTicket: Asyncified<typeof adminMock.replyToTicket> = disabledAsync;
export const closeTicket: Asyncified<typeof adminMock.closeTicket> = disabledAsync;

export const approveWithdrawal: Asyncified<typeof adminMock.approveWithdrawal> = disabledAsync;
export const rejectWithdrawal: Asyncified<typeof adminMock.rejectWithdrawal> = disabledAsync;
export const reviewWithdrawal: Asyncified<typeof adminMock.reviewWithdrawal> = disabledAsync;
export const listB2bPendingContracts: Asyncified<typeof adminMock.listB2bPendingContracts> = disabledAsync;
export const approveB2bPayment: Asyncified<typeof adminMock.approveB2bPayment> = disabledAsync;
export const rejectB2bPayment: Asyncified<typeof adminMock.rejectB2bPayment> = disabledAsync;
export const reverseTransaction: Asyncified<typeof adminMock.reverseTransaction> = disabledAsync;

export const saveCategory: Asyncified<typeof adminMock.saveCategory> = disabledAsync;
export const toggleCategoryActive: Asyncified<typeof adminMock.toggleCategoryActive> = disabledAsync;
export const updatePlatformSetting: Asyncified<typeof adminMock.updatePlatformSetting> = disabledAsync;
export const addInternalNote: Asyncified<typeof adminMock.addInternalNote> = disabledAsync;
export const addAudit: Asyncified<typeof adminMock.addAudit> = disabledAsync;

export type { SearchResultItem } from "@/lib/admin-api";
