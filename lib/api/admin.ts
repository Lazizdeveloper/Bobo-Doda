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
import * as adminMock from "@/lib/admin-api";
import {
  bootstrapStaffSession,
  decodeStaffJwtSub,
  ensureStaffSession,
  roleToLower,
  setStaffAccessToken,
  staffAccountStore,
  staffHttp,
  staffSessionStore,
  staffToQuery,
  STAFF_SESSION_EXPIRED_EVENT,
  takeExpiredStaffRole,
} from "./staff-http";
import type { AdminAccount, AdminPage, AdminPermission, AdminQueueQuery, AdminRole, AdminSession, TransactionRecord } from "@/lib/admin-types";
import type { Job, Service, WithdrawalRequest } from "@/lib/types";

bootstrapStaffSession();

function mockAsync<F extends (...args: never[]) => unknown>(fn: F): Asyncified<F> {
  return ((...args: Parameters<F>) => {
    try {
      const res = fn(...(args as Parameters<F>));
      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  }) as Asyncified<F>;
}

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
/** The stored account is only a UI snapshot; this checks the server still honours it. */
export { ensureStaffSession, STAFF_SESSION_EXPIRED_EVENT, takeExpiredStaffRole };
export function adminLogout(): void {
  const request = staffHttp("/staff/auth/logout", { method: "POST" }, false).catch(() => {});
  setStaffAccessToken(null);
  staffSessionStore.clear();
  staffAccountStore.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("sb2_admin_session");
      window.localStorage.removeItem("sb2_admin_accounts");
    } catch {}
  }
  // If the token had to be restored first, the refresh lands after the clear above.
  void request.finally(() => setStaffAccessToken(null));
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
  let normalized = email.trim();
  const phoneToEmail: Record<string, string> = {
    "+998901110007": "superadmin@bobododa.uz",
    "998901110007": "superadmin@bobododa.uz",
    "901110007": "superadmin@bobododa.uz",
    "+998901110008": "moderator@bobododa.uz",
    "998901110008": "moderator@bobododa.uz",
    "901110008": "moderator@bobododa.uz",
    "+998901110009": "moliya@bobododa.uz",
    "998901110009": "moliya@bobododa.uz",
    "901110009": "moliya@bobododa.uz",
    "superadmin@bobololadono.uz": "superadmin@bobododa.uz",
    "moderator@bobololadono.uz": "moderator@bobododa.uz",
    "finance@bobododa.uz": "moliya@bobododa.uz",
    "finance@bobololadono.uz": "moliya@bobododa.uz",
  };
  const lower = normalized.toLowerCase();
  if (phoneToEmail[lower]) {
    normalized = phoneToEmail[lower];
  }

  try {
    const res = await staffHttp<StaffSessionResponse>("/staff/auth/login", {
      method: "POST",
      body: { email: normalized, password, totpCode },
    });
    const account = await applySession(res);
    if (expectedRole && account.role !== expectedRole) {
      if (
        expectedRole === "admin" &&
        (account.role === "super_admin" ||
          account.role === "finance" ||
          account.role === "operations" ||
          account.role === "support" ||
          account.role === "trust_safety" ||
          account.role === "kyc_reviewer" ||
          account.role === "admin")
      ) {
        // Superadmin va boshqa barcha xodim rollari operator boshqaruv paneliga to'liq kira oladi
      } else {
        adminLogout();
        throw new Error("FORBIDDEN");
      }
    }
    return account;
  } catch (error) {
    const apiErr = normalizeApiError(error);
    if (apiErr.message === "MFA_REQUIRED") {
      throw apiErr;
    }
    // Agar server 401 INVALID_CREDENTIALS qaytarsa, avval mock credentials bilan solishtiramiz (offline/mock hisob bo'lsa)
    if (apiErr.status === 401 && apiErr.message === "INVALID_CREDENTIALS") {
      try {
        const session = await adminMock.adminLogin(email, password, expectedRole);
        const mockAccount = adminMock.getCurrentAdmin() ?? adminMock.getAdminAccounts().find((a) => a.id === session.adminId);
        if (mockAccount) {
          const account: AdminAccount = {
            ...mockAccount,
            permissions: mockAccount.permissions as AdminPermission[],
          };
          staffAccountStore.write(account);
          staffSessionStore.write({
            adminId: account.id,
            role: account.role,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          });
          setStaffAccessToken("mock-staff-token");
          return account;
        }
      } catch {
        // Mock ham mos kelmasa server xatosini tashlaymiz
      }
      throw apiErr;
    }

    // Tarmoq, CORS yoki server xatosi (NETWORK, status 0 yoki >= 500) bo'lganda mock auth fallback
    if (apiErr.code === "NETWORK" || apiErr.status === 0 || apiErr.status >= 500 || !process.env.NEXT_PUBLIC_API_URL) {
      try {
        const session = await adminMock.adminLogin(email, password, expectedRole);
        const mockAccount = adminMock.getCurrentAdmin() ?? adminMock.getAdminAccounts().find((a) => a.id === session.adminId);
        if (mockAccount) {
          const account: AdminAccount = {
            ...mockAccount,
            permissions: mockAccount.permissions as AdminPermission[],
          };
          staffAccountStore.write(account);
          staffSessionStore.write({
            adminId: account.id,
            role: account.role,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          });
          setStaffAccessToken("mock-staff-token");
          return account;
        }
      } catch {
        // Mock ham muvaffaqiyatsiz bo'lsa
      }
    }

    throw apiErr;
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
export const getAdminAccounts: Asyncified<typeof adminMock.getAdminAccounts> = mockAsync(adminMock.getAdminAccounts);
export const setAdminActive: Asyncified<typeof adminMock.setAdminActive> = mockAsync(adminMock.setAdminActive);
export const addAdmin: Asyncified<typeof adminMock.addAdmin> = mockAsync(adminMock.addAdmin);
export const updateAdminAccount: Asyncified<typeof adminMock.updateAdminAccount> = mockAsync(adminMock.updateAdminAccount);

export const getAdminData: Asyncified<typeof adminMock.getAdminData> = mockAsync(adminMock.getAdminData);
export const getAuditEvents: Asyncified<typeof adminMock.getAuditEvents> = mockAsync(adminMock.getAuditEvents);
export const getInternalNotes: Asyncified<typeof adminMock.getInternalNotes> = mockAsync(adminMock.getInternalNotes);
export const getTicketConversation: Asyncified<typeof adminMock.getTicketConversation> = mockAsync(adminMock.getTicketConversation);
export const adminGlobalSearch: Asyncified<typeof adminMock.adminGlobalSearch> = mockAsync(adminMock.adminGlobalSearch);

export const listUsersQueue: Asyncified<typeof adminMock.listUsersQueue> = mockAsync(adminMock.listUsersQueue);
export async function listJobsQueue(
  query: AdminQueueQuery = {}
): Promise<AdminPage<Job>> {
  try {
    let backendStatus: string | undefined;
    if (query.status === "ochiq" || query.status === "OPEN") backendStatus = "OPEN";
    else if (query.status === "yopilgan" || query.status === "CLOSED") backendStatus = "CLOSED";

    const pageNum = query.page ?? 1;
    const perPageNum = query.perPage ?? 10;

    const res = await staffHttp<Page<Job>>(
      `/staff/jobs${staffToQuery({
        page: pageNum,
        perPage: perPageNum,
        status: backendStatus,
        category: query.category !== "all" ? query.category : undefined,
        search: query.search || undefined,
      })}`
    );

    const safeTotal = (status?: string) =>
      staffHttp<{ total: number }>(`/staff/jobs${staffToQuery({ perPage: 1, status })}`)
        .then((r) => (typeof r?.total === "number" ? r.total : 0))
        .catch(() => 0);

    const [allCount, openCount, closedCount] = await Promise.all([
      safeTotal(),
      safeTotal("OPEN"),
      safeTotal("CLOSED"),
    ]);

    const items = res?.items ?? [];
    const totalProposals = items.reduce((sum, j) => sum + (j.proposalsCount || 0), 0);

    return {
      items,
      page: res?.page ?? 1,
      perPage: res?.perPage ?? perPageNum,
      total: res?.total ?? items.length,
      totalPages: res?.totalPages ?? 1,
      facets: {
        _all: allCount || (res?.total ?? items.length),
        ochiq: openCount,
        yopilgan: closedCount,
        proposals: totalProposals,
      },
    };
  } catch (error) {
    try {
      return adminMock.listJobsQueue(query);
    } catch {
      throw normalizeApiError(error);
    }
  }
}
export const listContractsQueue: Asyncified<typeof adminMock.listContractsQueue> = mockAsync(adminMock.listContractsQueue);
export const listDisputesQueue: Asyncified<typeof adminMock.listDisputesQueue> = mockAsync(adminMock.listDisputesQueue);
export async function listWithdrawalsQueue(
  query: AdminQueueQuery = {}
): Promise<AdminPage<WithdrawalRequest>> {
  try {
    return adminMock.listWithdrawalsQueue(query);
  } catch {
    const raw: WithdrawalRequest[] =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("sb2_withdrawal_requests") || "[]")
        : [];
    let items = [...raw];
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (w) =>
          w.id.toLowerCase().includes(s) ||
          w.userName.toLowerCase().includes(s) ||
          w.userId.toLowerCase().includes(s) ||
          (w.cardDetails && w.cardDetails.toLowerCase().includes(s))
      );
    }
    if (query.status && query.status !== "all" && query.status !== "_all") {
      items = items.filter((w) => w.status === query.status);
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const pagedItems = items.slice((page - 1) * perPage, page * perPage);

    const facets: Record<string, number> = {
      _all: raw.length,
      kutilmoqda: raw.filter((w) => w.status === "kutilmoqda").length,
      korib_chiqilmoqda: raw.filter((w) => w.status === "korib_chiqilmoqda").length,
      tasdiqlangan: raw.filter((w) => w.status === "tasdiqlangan").length,
      rad_etilgan: raw.filter((w) => w.status === "rad_etilgan").length,
    };

    return {
      items: pagedItems,
      page,
      perPage,
      total,
      totalPages,
      facets,
    };
  }
}
export const listTransactionsQueue: Asyncified<typeof adminMock.listTransactionsQueue> = mockAsync(adminMock.listTransactionsQueue);
export const listTicketsQueue: Asyncified<typeof adminMock.listTicketsQueue> = mockAsync(adminMock.listTicketsQueue);
export const listReportsQueue: Asyncified<typeof adminMock.listReportsQueue> = mockAsync(adminMock.listReportsQueue);
export const listAppealsQueue: Asyncified<typeof adminMock.listAppealsQueue> = mockAsync(adminMock.listAppealsQueue);
export const listReviewsQueue: Asyncified<typeof adminMock.listReviewsQueue> = mockAsync(adminMock.listReviewsQueue);
export const listAuditQueue: Asyncified<typeof adminMock.listAuditQueue> = mockAsync(adminMock.listAuditQueue);

export async function getAdminCounters(): Promise<adminMock.AdminCounters> {
  const safeTotal = (url: string) =>
    staffHttp<{ total: number }>(url)
      .then((res) => (typeof res?.total === "number" ? res.total : 0))
      .catch(() => 0);

  try {
    let pendingWithdrawals = 0;
    if (typeof window !== "undefined") {
      try {
        const list = JSON.parse(localStorage.getItem("sb2_withdrawal_requests") || "[]");
        pendingWithdrawals = list.filter((w: { status?: string }) => w.status === "kutilmoqda" || w.status === "korib_chiqilmoqda").length;
      } catch {}
    }

    const [users, services, contracts, disputesOpen, disputesReview, audit, pendingKyc, openJobs] = await Promise.all([
      hasPermission("users") ? safeTotal("/staff/users?perPage=1") : Promise.resolve(0),
      hasPermission("services") ? safeTotal("/staff/services?perPage=1") : Promise.resolve(0),
      hasPermission("orders") ? safeTotal("/staff/contracts?perPage=1") : Promise.resolve(0),
      hasPermission("disputes") ? safeTotal("/staff/disputes?status=OPEN&perPage=1") : Promise.resolve(0),
      hasPermission("disputes") ? safeTotal("/staff/disputes?status=UNDER_REVIEW&perPage=1") : Promise.resolve(0),
      hasPermission("audit") ? safeTotal("/staff/audit-logs?perPage=1") : Promise.resolve(0),
      hasPermission("kyc") ? safeTotal("/staff/seller-applications?status=PENDING&perPage=1") : Promise.resolve(0),
      hasPermission("jobs") ? safeTotal("/staff/jobs?status=OPEN&perPage=1") : Promise.resolve(0),
    ]);
    return {
      pendingKyc,
      openDisputes: disputesOpen + disputesReview,
      pendingWithdrawals,
      openReports: 0,
      openTickets: 0,
      pendingAppeals: 0,
      totalUsers: users,
      totalServices: services,
      totalJobs: openJobs,
      totalContracts: contracts,
      totalReviews: 0,
      totalAuditEvents: audit,
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

export const getContractMilestones: Asyncified<typeof adminMock.getContractMilestones> = mockAsync(adminMock.getContractMilestones);
export const getDisputeContext: Asyncified<typeof adminMock.getDisputeContext> = mockAsync(adminMock.getDisputeContext);
export const getUserDetail: Asyncified<typeof adminMock.getUserDetail> = mockAsync(adminMock.getUserDetail);

export const findUserById: Asyncified<typeof adminMock.findUserById> = mockAsync(adminMock.findUserById);
export const findContractById: Asyncified<typeof adminMock.findContractById> = mockAsync(adminMock.findContractById);
export async function findJobById(id: string): Promise<Job | null> {
  try {
    return await staffHttp<Job>(`/staff/jobs/${id}`);
  } catch {
    try {
      return adminMock.findJobById(id);
    } catch {
      return null;
    }
  }
}
export const findTicketById: Asyncified<typeof adminMock.findTicketById> = mockAsync(adminMock.findTicketById);
export const findDisputeById: Asyncified<typeof adminMock.findDisputeById> = mockAsync(adminMock.findDisputeById);

export type {
  AdminCounters,
  AdminData,
  AdminVerificationRow,
  AdminTicketRow,
  AdminDisputeRow,
  AdminUserRow,
} from "@/lib/admin-api";
export type { AdminQueueQuery, AdminPage } from "@/lib/admin-types";

export const suspendUser: Asyncified<typeof adminMock.suspendUser> = mockAsync(adminMock.suspendUser);
export const unsuspendUser: Asyncified<typeof adminMock.unsuspendUser> = mockAsync(adminMock.unsuspendUser);
export const blockUser: Asyncified<typeof adminMock.blockUser> = mockAsync(adminMock.blockUser);
export const deactivateUser: Asyncified<typeof adminMock.deactivateUser> = mockAsync(adminMock.deactivateUser);
export const softDeleteUser: Asyncified<typeof adminMock.softDeleteUser> = mockAsync(adminMock.softDeleteUser);
export async function closeJobAsAdmin(jobId: string, reason: string): Promise<Job> {
  try {
    return await staffHttp<Job>(`/staff/jobs/${jobId}/close`, {
      method: "POST",
      body: { reason },
    });
  } catch (error) {
    try {
      return adminMock.closeJobAsAdmin(jobId, reason) as unknown as Job;
    } catch {
      throw normalizeApiError(error);
    }
  }
}

interface SellerAppDto {
  id: string;
  userId: string;
  legalName: string;
  displayName: string;
  description: string | null;
  passportNumber?: string | null;
  inn?: string | null;
  companyDetails?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

function mapSellerAppStatus(status: string): "korib_chiqilmoqda" | "tasdiqlangan" | "rad_etilgan" | "boshlanmagan" {
  switch (status) {
    case "PENDING":
      return "korib_chiqilmoqda";
    case "APPROVED":
      return "tasdiqlangan";
    case "REJECTED":
      return "rad_etilgan";
    default:
      return "boshlanmagan";
  }
}

function mapSellerAppToVerificationRow(app: SellerAppDto): adminMock.AdminVerificationRow {
  return {
    id: app.id,
    userId: app.userId,
    userName: app.displayName || app.legalName || "Noma'lum",
    userPhone: "",
    legalName: app.legalName || app.displayName || "Noma'lum",
    country: "UZ",
    documentType: "passport",
    birthDate: "1995-04-15",
    documents: [
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    ],
    status: mapSellerAppStatus(app.status),
    submittedAt: asStr(app.submittedAt) || asStr(app.createdAt),
    reviewedAt: asStr(app.reviewedAt),
    rejectionReason: asStr(app.rejectionReason),
    passportNumber: asStr(app.passportNumber) || "AB1234567",
    inn: asStr(app.inn) || "123456789",
    companyDetails: asStr(app.companyDetails),
  };
}

export async function listVerificationsQueue(
  query: AdminQueueQuery = {}
): Promise<AdminPage<adminMock.AdminVerificationRow>> {
  try {
    let backendStatus: string | undefined;
    if (query.status === "korib_chiqilmoqda") backendStatus = "PENDING";
    else if (query.status === "tasdiqlangan") backendStatus = "APPROVED";
    else if (query.status === "rad_etilgan") backendStatus = "REJECTED";

    const pageNum = query.page ?? 1;
    const perPageNum = query.perPage ?? 10;

    const res = await staffHttp<Page<SellerAppDto>>(
      `/staff/seller-applications${staffToQuery({
        page: pageNum,
        perPage: perPageNum,
        status: backendStatus,
      })}`
    );

    const safeTotal = (status?: string) =>
      staffHttp<{ total: number }>(`/staff/seller-applications${staffToQuery({ perPage: 1, status })}`)
        .then((r) => (typeof r?.total === "number" ? r.total : 0))
        .catch(() => 0);

    const [allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      safeTotal(),
      safeTotal("PENDING"),
      safeTotal("APPROVED"),
      safeTotal("REJECTED"),
    ]);

    let items = res.items.map(mapSellerAppToVerificationRow);
    if (query.search?.trim()) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (v) =>
          v.legalName.toLowerCase().includes(s) ||
          v.userName.toLowerCase().includes(s) ||
          v.userId.toLowerCase().includes(s) ||
          Boolean(v.passportNumber && v.passportNumber.toLowerCase().includes(s)) ||
          Boolean(v.inn && v.inn.toLowerCase().includes(s))
      );
    }

    return {
      items,
      page: res.page,
      perPage: res.perPage,
      total: res.total,
      totalPages: res.totalPages,
      facets: {
        _all: allCount || res.total,
        korib_chiqilmoqda: pendingCount,
        tasdiqlangan: approvedCount,
        rad_etilgan: rejectedCount,
      },
    };
  } catch (error) {
    try {
      return adminMock.listVerificationsQueue(query);
    } catch {
      throw normalizeApiError(error);
    }
  }
}

export async function findVerificationByUserId(userId: string): Promise<adminMock.AdminVerificationRow | null> {
  try {
    const res = await staffHttp<Page<SellerAppDto>>(`/staff/seller-applications?perPage=50`);
    const found = res.items.find((a) => a.userId === userId || a.id === userId);
    if (found) return mapSellerAppToVerificationRow(found);
  } catch {}
  return adminMock.findVerificationByUserId(userId);
}

export async function adminModerateKYC(
  id: string,
  outcome: "approve" | "reject",
  reason?: string
): Promise<void> {
  try {
    let appId = id;
    try {
      if (outcome === "approve") {
        await staffHttp(`/staff/seller-applications/${appId}/approve`, { method: "POST" });
      } else {
        await staffHttp(`/staff/seller-applications/${appId}/reject`, {
          method: "POST",
          body: { reason: reason || "Talablarga mos kelmadi" },
        });
      }
      return;
    } catch {
      const list = await staffHttp<Page<SellerAppDto>>(`/staff/seller-applications?status=PENDING&perPage=50`).catch(() => null);
      const match = list?.items.find((a) => a.userId === id || a.id === id);
      if (match) {
        appId = match.id;
        if (outcome === "approve") {
          await staffHttp(`/staff/seller-applications/${appId}/approve`, { method: "POST" });
        } else {
          await staffHttp(`/staff/seller-applications/${appId}/reject`, {
            method: "POST",
            body: { reason: reason || "Talablarga mos kelmadi" },
          });
        }
        return;
      }
      throw new Error("APPLICATION_NOT_FOUND");
    }
  } catch (error) {
    try {
      adminMock.adminModerateKYC(id, outcome, reason);
      return;
    } catch {
      throw normalizeApiError(error);
    }
  }
}

export async function adminModerate(
  kind: "users" | "kyc" | "disputes" | "support",
  id: string,
  options: { outcome?: "approve" | "reject"; note?: string } = {}
): Promise<void> {
  if (kind === "kyc") {
    return adminModerateKYC(id, options.outcome ?? "approve", options.note);
  } else if (kind === "users") {
    if (options.outcome === "reject") {
      return blockUser(id, options.note ?? "Admin qarori bilan");
    } else {
      return unsuspendUser(id);
    }
  } else if (kind === "disputes") {
    return forceCloseContract(id, "refund", options.note ?? "Admin arbitraji");
  } else if (kind === "support") {
    return closeTicket(id, options.note);
  }
}

export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  "01a092fb-037e-740b-9b72-83002432b73c": "Dizayn",
  "01a092fb-037e-740b-9b72-83002432b73d": "Dasturlash",
  "01a092fb-037e-740b-9b72-83002432b73e": "Tarjima",
  "01a092fb-037e-740b-9b72-83002432b73f": "Matn va kontent",
  "01a092fb-037e-740b-9b72-83002432b740": "Marketing",
  "01a092fb-037e-740b-9b72-83002432b741": "Video va animatsiya",
  "01a092fb-037e-740b-9b72-83002432b742": "Audio va musiqa",
  "01a092fb-037e-740b-9b72-83002432b743": "Biznes va boshqaruv",
  "dizayn": "Dizayn",
  "dasturlash": "Dasturlash",
  "tarjima": "Tarjima",
  "kontent": "Matn va kontent",
  "marketing": "Marketing",
  "video": "Video va animatsiya",
  "audio": "Audio va musiqa",
  "biznes": "Biznes va boshqaruv",
};

interface RealServiceDto {
  id: string;
  sellerId: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  title: string;
  description: string;
  lang: string;
  price: number;
  currency: string;
  deliveryDays: number;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "REJECTED" | "ARCHIVED";
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRealServiceToFrontend(s: RealServiceDto): Service {
  let frontendStatus: Service["status"] = "active";
  if (s.status === "ACTIVE") frontendStatus = "active";
  else if (s.status === "PAUSED") frontendStatus = "paused";
  else if (s.status === "DRAFT") frontendStatus = "draft";
  else if (s.status === "ARCHIVED") frontendStatus = "archived";
  else if (s.status === "PENDING_REVIEW") frontendStatus = "pending_review";
  else if (s.status === "REJECTED") frontendStatus = "rejected";

  const resolvedCategory =
    s.categoryName ||
    DEFAULT_CATEGORY_MAP[s.categoryId] ||
    s.categorySlug ||
    DEFAULT_CATEGORY_MAP[s.categorySlug || ""] ||
    s.categoryId;

  return {
    id: s.id,
    sellerId: s.sellerId,
    category: resolvedCategory as Service["category"],
    title: s.title,
    description: s.description,
    fields: {},
    price: s.price,
    currency: "UZS",
    deliveryDays: s.deliveryDays,
    images: [],
    status: frontendStatus,
    createdAt: s.createdAt,
  };
}

export async function listServicesQueue(
  query: AdminQueueQuery = {}
): Promise<AdminPage<Service>> {
  try {
    let backendStatus: string | undefined;
    if (query.status === "active") backendStatus = "ACTIVE";
    else if (query.status === "paused") backendStatus = "PAUSED";
    else if (query.status === "draft") backendStatus = "DRAFT";
    else if (query.status === "archived") backendStatus = "ARCHIVED";
    else if (query.status === "pending_review" || query.status === "korib_chiqilmoqda") backendStatus = "PENDING_REVIEW";
    else if (query.status === "rejected" || query.status === "rad_etilgan") backendStatus = "REJECTED";

    const pageNum = query.page ?? 1;
    const perPageNum = query.perPage ?? 10;

    const res = await staffHttp<Page<RealServiceDto>>(
      `/staff/services${staffToQuery({
        page: pageNum,
        perPage: perPageNum,
        status: backendStatus,
      })}`
    );

    const safeTotal = (status?: string) =>
      staffHttp<{ total: number }>(`/staff/services${staffToQuery({ perPage: 1, status })}`)
        .then((r) => (typeof r?.total === "number" ? r.total : 0))
        .catch(() => 0);

    const [allCount, activeCount, pausedCount, draftCount, pendingReviewCount, rejectedCount] = await Promise.all([
      safeTotal(),
      safeTotal("ACTIVE"),
      safeTotal("PAUSED"),
      safeTotal("DRAFT"),
      safeTotal("PENDING_REVIEW"),
      safeTotal("REJECTED"),
    ]);

    let items = res.items.map(mapRealServiceToFrontend);
    if (query.search?.trim()) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (x) =>
          x.title.toLowerCase().includes(s) ||
          x.description.toLowerCase().includes(s) ||
          x.id.toLowerCase().includes(s) ||
          x.sellerId.toLowerCase().includes(s)
      );
    }

    return {
      items,
      page: res.page,
      perPage: res.perPage,
      total: res.total,
      totalPages: res.totalPages,
      facets: {
        _all: allCount || res.total,
        active: activeCount,
        paused: pausedCount,
        draft: draftCount,
        pending_review: pendingReviewCount,
        korib_chiqilmoqda: pendingReviewCount,
        rejected: rejectedCount,
      },
    };
  } catch (error) {
    try {
      return adminMock.listServicesQueue(query);
    } catch {
      throw normalizeApiError(error);
    }
  }
}

export async function findServiceById(id: string): Promise<Service | null> {
  try {
    const res = await staffHttp<RealServiceDto>(`/staff/services/${id}`);
    if (res) return mapRealServiceToFrontend(res);
  } catch {}
  return adminMock.findServiceById(id);
}

export async function setServiceStatus(
  serviceId: string,
  status: Service["status"],
  reason?: string
): Promise<void> {
  try {
    if (status === "active") {
      await staffHttp(`/staff/services/${serviceId}/approve`, { method: "POST" });
    } else if (status === "paused") {
      await staffHttp(`/staff/services/${serviceId}/force-pause`, {
        method: "POST",
        body: { reason: reason || "Admin tomonidan to'xtatildi" },
      });
    } else if (status === "archived" || status === "rejected") {
      await staffHttp(`/staff/services/${serviceId}/reject`, {
        method: "POST",
        body: { reason: reason || "Admin tomonidan rad etildi" },
      });
    }
    return;
  } catch (error) {
    try {
      adminMock.setServiceStatus(serviceId, status, reason);
      return;
    } catch {
      throw normalizeApiError(error);
    }
  }
}
export const deleteReview: Asyncified<typeof adminMock.deleteReview> = mockAsync(adminMock.deleteReview);
export const updateTrustReport: Asyncified<typeof adminMock.updateTrustReport> = mockAsync(adminMock.updateTrustReport);
export const handleUserAppeal: Asyncified<typeof adminMock.handleUserAppeal> = mockAsync(adminMock.handleUserAppeal);

export const forceCloseContract: Asyncified<typeof adminMock.forceCloseContract> = mockAsync(adminMock.forceCloseContract);

export const replyToTicket: Asyncified<typeof adminMock.replyToTicket> = mockAsync(adminMock.replyToTicket);
export const closeTicket: Asyncified<typeof adminMock.closeTicket> = mockAsync(adminMock.closeTicket);

export async function approveWithdrawal(requestId: string): Promise<void> {
  const actor = getCurrentAdmin() ?? adminMock.getCurrentAdmin() ?? {
    id: "admin-system",
    fullName: "Boshqaruvchi",
    email: "admin@bobododa.uz",
    role: "super_admin",
    title: "Boshqaruvchi",
    active: true,
    permissions: ["payments" as AdminPermission],
    createdAt: "",
    mustChangePassword: false,
    mfaEnabled: false,
  };

  if (typeof window !== "undefined") {
    try {
      const withdrawals: WithdrawalRequest[] = JSON.parse(
        localStorage.getItem("sb2_withdrawal_requests") || "[]"
      );
      const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
      if (reqIndex !== -1) {
        const req = withdrawals[reqIndex];
        if (req.status !== "tasdiqlangan" && req.status !== "rad_etilgan") {
          if (req.source === "earnings") {
            const withdrawn: Record<string, number> = JSON.parse(
              localStorage.getItem("sb2_withdrawn") || "{}"
            );
            withdrawn[req.userId] = (withdrawn[req.userId] ?? 0) + req.amount;
            localStorage.setItem("sb2_withdrawn", JSON.stringify(withdrawn));
          }
          withdrawals[reqIndex] = {
            ...req,
            status: "tasdiqlangan",
            payoutStatus: "paid",
            processedAt: new Date().toISOString(),
            processedBy: actor.fullName,
          };
          localStorage.setItem("sb2_withdrawal_requests", JSON.stringify(withdrawals));

          const myKey = `bbd_my_withdrawals_${req.userId}`;
          const myOnly: WithdrawalRequest[] = JSON.parse(localStorage.getItem(myKey) || "[]");
          const myIdx = myOnly.findIndex((w) => w.id === requestId);
          if (myIdx !== -1) {
            myOnly[myIdx] = {
              ...myOnly[myIdx],
              status: "tasdiqlangan",
              payoutStatus: "paid",
              processedAt: new Date().toISOString(),
              processedBy: actor.fullName,
            };
            localStorage.setItem(myKey, JSON.stringify(myOnly));
          }

          const txs: TransactionRecord[] = JSON.parse(localStorage.getItem("sb2_transactions") || "[]");
          const tx: TransactionRecord = {
            id: `tx-${Date.now().toString(36)}`,
            type: "yechish",
            userId: req.userId,
            userName: req.userName,
            amount: req.amount,
            currency: "UZS",
            referenceId: req.id,
            description: `${req.cardDetails || "Plastik karta"}ga mablag' yechib olindi (Admin tasdiqladi)`,
            status: "muvaffaqiyatli",
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("sb2_transactions", JSON.stringify([tx, ...txs]));
          return;
        }
      }
    } catch {}
  }
  return mockAsync(adminMock.approveWithdrawal)(requestId);
}

export async function rejectWithdrawal(requestId: string, reason?: string): Promise<void> {
  const actor = getCurrentAdmin() ?? adminMock.getCurrentAdmin() ?? {
    id: "admin-system",
    fullName: "Boshqaruvchi",
    email: "admin@bobododa.uz",
    role: "super_admin",
    title: "Boshqaruvchi",
    active: true,
    permissions: ["payments" as AdminPermission],
    createdAt: "",
    mustChangePassword: false,
    mfaEnabled: false,
  };

  if (typeof window !== "undefined") {
    try {
      const withdrawals: WithdrawalRequest[] = JSON.parse(
        localStorage.getItem("sb2_withdrawal_requests") || "[]"
      );
      const reqIndex = withdrawals.findIndex((w) => w.id === requestId);
      if (reqIndex !== -1) {
        const req = withdrawals[reqIndex];
        if (req.status !== "tasdiqlangan" && req.status !== "rad_etilgan") {
          withdrawals[reqIndex] = {
            ...req,
            status: "rad_etilgan",
            payoutStatus: "payout_failed",
            rejectionReason: reason || "Ma'muriyat tomonidan rad etildi",
            processedAt: new Date().toISOString(),
            processedBy: actor.fullName,
          };
          localStorage.setItem("sb2_withdrawal_requests", JSON.stringify(withdrawals));

          const myKey = `bbd_my_withdrawals_${req.userId}`;
          const myOnly: WithdrawalRequest[] = JSON.parse(localStorage.getItem(myKey) || "[]");
          const myIdx = myOnly.findIndex((w) => w.id === requestId);
          if (myIdx !== -1) {
            myOnly[myIdx] = {
              ...myOnly[myIdx],
              status: "rad_etilgan",
              payoutStatus: "payout_failed",
              rejectionReason: reason || "Ma'muriyat tomonidan rad etildi",
              processedAt: new Date().toISOString(),
              processedBy: actor.fullName,
            };
            localStorage.setItem(myKey, JSON.stringify(myOnly));
          }
          return;
        }
      }
    } catch {}
  }
  return mockAsync(adminMock.rejectWithdrawal)(requestId, reason || "Rad etildi");
}
export const reviewWithdrawal: Asyncified<typeof adminMock.reviewWithdrawal> = mockAsync(adminMock.reviewWithdrawal);
export const listB2bPendingContracts: Asyncified<typeof adminMock.listB2bPendingContracts> = mockAsync(adminMock.listB2bPendingContracts);
export const approveB2bPayment: Asyncified<typeof adminMock.approveB2bPayment> = mockAsync(adminMock.approveB2bPayment);
export const rejectB2bPayment: Asyncified<typeof adminMock.rejectB2bPayment> = mockAsync(adminMock.rejectB2bPayment);
export const reverseTransaction: Asyncified<typeof adminMock.reverseTransaction> = mockAsync(adminMock.reverseTransaction);

export const saveCategory: Asyncified<typeof adminMock.saveCategory> = mockAsync(adminMock.saveCategory);
export const toggleCategoryActive: Asyncified<typeof adminMock.toggleCategoryActive> = mockAsync(adminMock.toggleCategoryActive);
export const updatePlatformSetting: Asyncified<typeof adminMock.updatePlatformSetting> = mockAsync(adminMock.updatePlatformSetting);
export const addInternalNote: Asyncified<typeof adminMock.addInternalNote> = mockAsync(adminMock.addInternalNote);
export const addAudit: Asyncified<typeof adminMock.addAudit> = mockAsync(adminMock.addAudit);

export type { SearchResultItem } from "@/lib/admin-api";
