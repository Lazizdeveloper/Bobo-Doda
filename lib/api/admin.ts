/**
 * Admin chegarasi — `app/admin/**` va `components/admin/**` FAQAT shu
 * moduldan import qiladi (hech qachon `@/lib/admin-api` dan to'g'ridan-to'g'ri).
 *
 * Ilgari bu fayl bitta `export * from "@/lib/admin-api"` qatoridan iborat edi
 * va shuning uchun ikki narsa yo'q edi:
 *
 * 1. **Xato taksonomiyasi.** Admin funksiyalari `throw new Error("FORBIDDEN")`
 *    tashlaydi. Ilova tomonida bunday xatolar `client.ts` da `ApiError` ga
 *    o'giriladi, admin tomonida esa o'girilmasdi — `<ErrorState>` har doim
 *    "yuklab bo'lmadi + qayta urinish" ko'rsatardi, hatto ruxsat yo'qligida
 *    ham (qayta urinish u yerda hech qachon yordam bermaydi).
 * 2. **Shartnoma.** Backend ulanganda almashtiriladigan aniq sirt yo'q edi.
 *
 * Endi har bir operatsiya shu yerdan, `ApiError` ga o'ralgan holda chiqadi.
 * Funksiya imzolari o'zgarmadi (sinxron — sinxron, async — async), shuning
 * uchun chaqiruvchi kod bir xil qoladi. Backend'ga o'tishda faqat shu fayl
 * (ilova tomonidagi `client.ts` kabi) HTTP chaqiruvlariga almashtiriladi.
 */
import * as adminMock from "@/lib/admin-api";
import { normalizeApiError } from "./errors";

/** SINXRON qoladigan amallar uchun (faqat sessiya/huquq snapshot'i).
    `ApiError.message` asl kod satri bo'lib qoladi (`"FORBIDDEN"`), shuning
    uchun kodga qarab matn tanlaydigan sahifalar o'zgarishsiz ishlaydi. */
function guard<A extends unknown[], R>(fn: (...args: A) => R) {
  return (...args: A): R => {
    try {
      return fn(...args);
    } catch (error) {
      throw normalizeApiError(error);
    }
  };
}

/** Allaqachon `Promise` qaytaradigan mock funksiyasi uchun. */
function guardAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeApiError(error);
    }
  };
}

/**
 * Sinxron mock funksiyasini ASYNC chegara amaliga aylantiradi.
 *
 * NEGA: backend'da har bir o'qish va mutatsiya HTTP so'rov, ya'ni majburan
 * promise. Agar chegara sinxron qolsa, backend ulangan kunda HAR BIR
 * chaqiruv joyi (`useEffect`, `load()`, tugma handleri) qayta yozilishi
 * kerak bo'lardi — ya'ni chegara o'z vazifasini bajarmagan bo'lardi.
 * Mock bugun javobni darhol qaytaradi, lekin imzo allaqachon kelajakdagi
 * shakl.
 *
 * ISTISNO — sessiya/huquq snapshot'i (`getCurrentAdmin`, `hasPermission`,
 * `getAdminSession`, `adminLogout`) sinxron qoladi: ular har render'da,
 * layout guard'ida chaqiriladi va backend'da ham brauzerdagi token
 * snapshot'idan o'qiladi (ilova tomonidagi `authService.getSession()` bilan
 * bir xil qoida).
 */
function asyncGuard<A extends unknown[], R>(fn: (...args: A) => R) {
  return async (...args: A): Promise<R> => guard(fn)(...args);
}

/* ---------------- Sessiya va huquq (SINXRON snapshot) ---------------- */
export const getAdminSession = guard(adminMock.getAdminSession);
export const getCurrentAdmin = guard(adminMock.getCurrentAdmin);
export const hasPermission = guard(adminMock.hasPermission);
export const adminLogout = guard(adminMock.adminLogout);

/* ---------------- Autentifikatsiya ---------------- */
export const adminLogin = guardAsync(adminMock.adminLogin);
export const getAdminAccounts = asyncGuard(adminMock.getAdminAccounts);
export const setAdminActive = asyncGuard(adminMock.setAdminActive);
export const addAdmin = asyncGuard(adminMock.addAdmin);

/* ---------------- O'qish ---------------- */
/**
 * @deprecated Ro'yxat sahifalarida ishlatilmasin — HAR BIR kolleksiyaning
 * HAMMA qatorini qaytaradi. Backend'da bu imkonsiz (100 000 shartnomani
 * brauzerga yuborib bo'lmaydi). Ro'yxatlar uchun `list*Queue`,
 * ko'rsatkichlar uchun `getAdminCounters` ishlating.
 */
export const getAdminData = asyncGuard(adminMock.getAdminData);
export const getAuditEvents = asyncGuard(adminMock.getAuditEvents);
export const getInternalNotes = asyncGuard(adminMock.getInternalNotes);
export const getTicketConversation = asyncGuard(adminMock.getTicketConversation);
export const adminGlobalSearch = asyncGuard(adminMock.adminGlobalSearch);

/* ---------------- Navbatlar (filtr + sahifalash server tomonida) ----------
     GET /api/v1/admin/queues/users?page=1&perPage=10&search=&status=
   Imzo va qaytish shakli (`AdminPage<T>`) backend'da ham bir xil. */
export const listUsersQueue = asyncGuard(adminMock.listUsersQueue);
export const listServicesQueue = asyncGuard(adminMock.listServicesQueue);
export const listJobsQueue = asyncGuard(adminMock.listJobsQueue);
export const listContractsQueue = asyncGuard(adminMock.listContractsQueue);
export const listVerificationsQueue = asyncGuard(adminMock.listVerificationsQueue);
export const listDisputesQueue = asyncGuard(adminMock.listDisputesQueue);
export const listWithdrawalsQueue = asyncGuard(adminMock.listWithdrawalsQueue);
export const listTransactionsQueue = asyncGuard(adminMock.listTransactionsQueue);
export const listTicketsQueue = asyncGuard(adminMock.listTicketsQueue);
export const listReportsQueue = asyncGuard(adminMock.listReportsQueue);
export const listAppealsQueue = asyncGuard(adminMock.listAppealsQueue);
export const listReviewsQueue = asyncGuard(adminMock.listReviewsQueue);
export const listAuditQueue = asyncGuard(adminMock.listAuditQueue);

/** Dashboard KPI va sidebar badge'lari uchun agregatlar (`GET /admin/stats`). */
export const getAdminCounters = asyncGuard(adminMock.getAdminCounters);

/* ---------------- Detal o'quvchilar (tanlangan yozuv bo'yicha) ---------- */
export const getContractMilestones = asyncGuard(adminMock.getContractMilestones);
export const getDisputeContext = asyncGuard(adminMock.getDisputeContext);
export const getUserDetail = asyncGuard(adminMock.getUserDetail);

/* Global qidiruv deep-link'i: yozuvni ID bo'yicha topadi. Yuklangan
   sahifadan izlash MUMKIN EMAS — ekranda atigi 10 ta qator bor. */
export const findUserById = asyncGuard(adminMock.findUserById);
export const findServiceById = asyncGuard(adminMock.findServiceById);
export const findContractById = asyncGuard(adminMock.findContractById);
export const findJobById = asyncGuard(adminMock.findJobById);
export const findVerificationByUserId = asyncGuard(adminMock.findVerificationByUserId);
export const findTicketById = asyncGuard(adminMock.findTicketById);
export const findDisputeById = asyncGuard(adminMock.findDisputeById);

export type {
  AdminCounters,
  AdminData,
  AdminVerificationRow,
  AdminTicketRow,
  AdminDisputeRow,
  AdminUserRow,
} from "@/lib/admin-api";
export type { AdminQueueQuery, AdminPage } from "@/lib/admin-types";

/* ---------------- Foydalanuvchi moderatsiyasi ---------------- */
export const suspendUser = asyncGuard(adminMock.suspendUser);
export const unsuspendUser = asyncGuard(adminMock.unsuspendUser);
export const blockUser = asyncGuard(adminMock.blockUser);
export const deactivateUser = asyncGuard(adminMock.deactivateUser);
export const softDeleteUser = asyncGuard(adminMock.softDeleteUser);
export const adminModerateKYC = asyncGuard(adminMock.adminModerateKYC);
export const adminModerate = asyncGuard(adminMock.adminModerate);

/* ---------------- Bozor moderatsiyasi ---------------- */
export const closeJobAsAdmin = asyncGuard(adminMock.closeJobAsAdmin);
export const setServiceStatus = asyncGuard(adminMock.setServiceStatus);
export const deleteReview = asyncGuard(adminMock.deleteReview);
export const updateTrustReport = asyncGuard(adminMock.updateTrustReport);
export const handleUserAppeal = asyncGuard(adminMock.handleUserAppeal);

/* ---------------- Nizo va arbitraj ---------------- */
export const forceCloseContract = asyncGuard(adminMock.forceCloseContract);

/* ---------------- Yordam xizmati ---------------- */
export const replyToTicket = asyncGuard(adminMock.replyToTicket);
export const closeTicket = asyncGuard(adminMock.closeTicket);

/* ---------------- Moliya ---------------- */
export const approveWithdrawal = asyncGuard(adminMock.approveWithdrawal);
export const rejectWithdrawal = asyncGuard(adminMock.rejectWithdrawal);
export const reviewWithdrawal = asyncGuard(adminMock.reviewWithdrawal);
export const listB2bPendingContracts = asyncGuard(adminMock.listB2bPendingContracts);
export const approveB2bPayment = asyncGuard(adminMock.approveB2bPayment);
export const rejectB2bPayment = asyncGuard(adminMock.rejectB2bPayment);

/* ---------------- Tizim ---------------- */
export const saveCategory = asyncGuard(adminMock.saveCategory);
export const toggleCategoryActive = asyncGuard(adminMock.toggleCategoryActive);
export const updatePlatformSetting = asyncGuard(adminMock.updatePlatformSetting);
export const addInternalNote = asyncGuard(adminMock.addInternalNote);
export const addAudit = asyncGuard(adminMock.addAudit);

export type { SearchResultItem } from "@/lib/admin-api";
