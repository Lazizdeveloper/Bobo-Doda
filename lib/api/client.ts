import type { components } from "@bobododa/contracts";
import type {
  AuthService,
  CatalogService,
  ContractsService,
  DisputesService,
  FilesService,
  JobsService,
  MessagesService,
  MilestonesService,
  NotificationsService,
  OffersService,
  PaymentsService,
  ProposalsService,
  ReviewsService,
  SavedService,
  SellerApplicationService,
  ServicesService,
  SupportRequestService,
  SupportService,
  UsersService,
  VerificationService,
} from "./contracts";
import { ApiError, withNormalizedErrors } from "./errors";
import { http, toQuery, sessionStore, setAccessToken, decodeJwtSub, refreshSession } from "./http";
import {
  asStr,
  mapContract,
  mapDispute,
  mapMilestone,
  mapPayment,
  mapPublicService,
  mapSellerApplicationStatus,
  mapSellerProfile,
  mapService,
  mapUser,
  roleToReal,
  roleToUz,
} from "./mappers";
import type * as Model from "@/lib/types";

type RealService = components["schemas"]["ServiceResponseDto"];
type RealPublicService = components["schemas"]["PublicServiceResponseDto"];
type RealContract = components["schemas"]["ContractResponseDto"];
type RealMilestone = components["schemas"]["MilestoneResponseDto"];
type RealPayment = components["schemas"]["PaymentResponseDto"];
type RealDispute = components["schemas"]["DisputeResponseDto"];
type RealMe = components["schemas"]["MeResponseDto"];
type RealSellerApplication = components["schemas"]["SellerApplicationResponseDto"];
type RealCategory = components["schemas"]["CategoryResponseDto"];
type RealAuthSession = components["schemas"]["AuthSessionDto"];
type Page<T> = { items: T[]; page: number; perPage: number; total: number; totalPages: number };

const call = <T>(operation: () => Promise<T>) => withNormalizedErrors(operation);

/** Bosqich 17 — real backendda hali qamrab olinmagan operatsiya: `client.ts`
    ATAYLAB shu kodni tashlaydi, `errors.ts#LEGACY_CODES` uni `FEATURE_DISABLED`
    ga o'giradi va mavjud `<ErrorState>` konvensiyasi ekranni ko'rsatadi. */
function disabled<T = never>(): Promise<T> {
  return Promise.reject(new Error("FEATURE_DISABLED"));
}

function currentRole(): Model.UserRole | null {
  return sessionStore.read()?.role ?? null;
}

/* ------------------------------------------------------------------------
   Kategoriyalar — ochiq, kam o'zgaradigan katalog; modul darajasida
   keshlanadi (ko'p joyda categoryId <-> slug tarjimasi kerak).
   ------------------------------------------------------------------------ */
let categoriesCache: RealCategory[] | null = null;
async function getCategories(): Promise<RealCategory[]> {
  if (categoriesCache) return categoriesCache;
  const list = await http<RealCategory[]>("/categories");
  categoriesCache = list;
  return list;
}
function slugById(categories: RealCategory[], id: string): string {
  return categories.find((c) => c.id === id)?.slug ?? "biznes";
}
function idBySlug(categories: RealCategory[], slug: string): string | undefined {
  return categories.find((c) => c.slug === slug)?.id;
}

/* ------------------------------------------------------------------------
   Shartnoma "mablag'langanmi" — real `ContractResponseDto`ning o'zida yo'q.
   Xaridor uchun `/me/payments?contractId=` orqali ANIQ, sotuvchi uchun
   ochiq endpoint yo'q — bosqich holatidan TAXMIN qilinadi. MUHIM: bosqich
   `ACTIVE` bo'lishi bilanoq (hali TO'LANMAGAN bo'lsa ham) `IN_PROGRESS`ga
   o'tadi (to'lovga bog'liq emas) — shuning uchun bu taxmin aslida "faol"
   bilan deyarli bir xil, aniq "to'langan" emas. Haqiqiy himoya baribir
   serverda: `submitMilestone` `CONTRACT_NOT_FUNDED`ni mustaqil tekshiradi —
   shu sabab bu yerdagi noaniqlik xavfsiz (eng yomoni: sotuvchi "topshirish"
   tugmasini erta ko'radi-yu, server uni rad etadi).
   ------------------------------------------------------------------------ */
async function hydrateContract(c: RealContract, role: Model.UserRole | null): Promise<Model.Contract> {
  let funded = false;
  let fundedAt: string | undefined;
  if (role === "mutaxassis") {
    funded = c.milestones.some((m) => m.status !== "PENDING");
    /* `mapContract` `funded=true` bo'lganda `fundedAt` YO'Q bo'lsa uni
       yana `undefined`ga qaytaradi (pastga qarang) — shuning uchun bu
       yerda albatta bir qiymat berish SHART, aks holda UI hech qachon
       "mablag'langan" holatini ko'rsatmaydi. Aniq vaqt yo'q — kontrakt
       oxirgi yangilangan payti bilan taxminlanadi. */
    fundedAt = funded ? c.updatedAt : undefined;
  } else {
    try {
      const page = await http<Page<RealPayment>>(`/me/payments${toQuery({ contractId: c.id, perPage: 5 })}`);
      const succeeded = page.items.find((p) => p.status === "SUCCEEDED");
      funded = !!succeeded;
      fundedAt = succeeded ? asStr(succeeded.succeededAt) : undefined;
    } catch {
      /* xaridor bo'lmasa yoki so'rov muvaffaqiyatsiz bo'lsa — unfunded deb qoladi */
    }
  }
  return mapContract(c, { funded, fundedAt });
}

/* ==========================================================================
   AUTH — Bosqich 21: parol bilan login. SMS FAQAT register/reset'da.
   Sessiya snapshot `lib/api/http.ts`da.
   ========================================================================== */
function writeSession(res: RealAuthSession): Model.Session {
  setAccessToken(res.accessToken);
  const session: Model.Session = {
    userId: decodeJwtSub(res.accessToken),
    role: roleToUz(res.activeRole),
    profileDone: res.profileDone,
    verified: true,
  };
  sessionStore.write(session);
  return session;
}

export const authService: AuthService = {
  getSession: sessionStore.read,
  requestRegisterOtp: (phone) =>
    call(async () => http<{ sent: true }>("/auth/register/request-otp", { method: "POST", body: { phone } })),
  verifyRegisterOtp: (phone, code) =>
    call(async () =>
      http<{ registrationToken: string }>("/auth/register/verify-otp", { method: "POST", body: { phone, code } }),
    ),
  completeRegistration: (registrationToken, password, confirmPassword) =>
    call(async () => {
      const res = await http<RealAuthSession>("/auth/register/complete", {
        method: "POST",
        body: { registrationToken, password, confirmPassword },
      });
      return writeSession(res);
    }),
  login: (phone, password) =>
    call(async () => {
      const res = await http<RealAuthSession>("/auth/login", { method: "POST", body: { phone, password } });
      return writeSession(res);
    }),
  requestPasswordResetOtp: (phone) =>
    call(async () =>
      http<{ sent: true }>("/auth/password-reset/request-otp", { method: "POST", body: { phone } }),
    ),
  verifyPasswordResetOtp: (phone, code) =>
    call(async () =>
      http<{ resetToken: string }>("/auth/password-reset/verify-otp", { method: "POST", body: { phone, code } }),
    ),
  completePasswordReset: (resetToken, password, confirmPassword) =>
    call(async () =>
      http<{ ok: true }>("/auth/password-reset/complete", {
        method: "POST",
        body: { resetToken, password, confirmPassword },
      }),
    ),
  chooseRole: (role) =>
    call(async () => {
      const res = await http<RealAuthSession>("/me/roles/choose", { method: "POST", body: { role: roleToReal(role) } });
      setAccessToken(res.accessToken);
      const session: Model.Session = {
        userId: decodeJwtSub(res.accessToken),
        role: roleToUz(res.activeRole),
        profileDone: res.profileDone,
        verified: true,
      };
      sessionStore.write(session);
      return session;
    }),
  refresh: () => call(refreshSession),
  logout: () => {
    void http("/auth/logout", { method: "POST" }, false).catch(() => {});
    setAccessToken(null);
    sessionStore.clear();
  },
};

/* ==========================================================================
   USERS — `/me` + `/me/profile`. Boy sotuvchi profili (bio/skills/portfolio)
   real backendda YO'Q — `setAvailability`/preferences/parol/eksport/o'chirish
   ham (OTP-only hisobda parol tushunchasi yo'q).
   ========================================================================== */
export const usersService: UsersService = {
  getCurrent: () =>
    call(async () => {
      try {
        return mapUser(await http<RealMe>("/me"));
      } catch (e) {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") return null;
        throw e;
      }
    }),
  getSellerProfile: () =>
    call(async () => {
      const me = await http<RealMe>("/me");
      let application: RealSellerApplication | null = null;
      try {
        application = await http<RealSellerApplication>("/me/seller-application");
      } catch {
        /* hali ariza yo'q */
      }
      return mapSellerProfile(me, application);
    }),
  updateName: (fullName) => call(async () => void (await http("/me/profile", { method: "PATCH", body: { fullName } }))),
  updateUserProfile: (data) =>
    call(async () => {
      if (data.fullName) await http("/me/profile", { method: "PATCH", body: { fullName: data.fullName } });
    }),
  completeSellerProfile: (input) =>
    call(async () => void (await http("/me/profile", { method: "PATCH", body: { fullName: input.fullName } }))),
  updateSellerProfile: (input) =>
    call(async () => void (await http("/me/profile", { method: "PATCH", body: { fullName: input.fullName } }))),
  setAvailability: () => disabled(),
  getPreferences: () => disabled(),
  savePreferences: () => disabled(),
  // Bosqich 21 — `User.passwordHash` endi haqiqiy (avval OTP-only edi,
  // almashtiradigan parol umuman yo'q edi).
  changePassword: (currentPassword, newPassword) =>
    call(async () => {
      await http("/me/change-password", { method: "POST", body: { currentPassword, newPassword } });
    }),
  exportData: () => disabled(),
  deleteAccount: () => disabled(),
};

/* ==========================================================================
   CATALOG — ochiq mutaxassis direktoriyasi real backendda YO'Q (faqat
   xodimlarga `staff/sellers`); sharh modeli ham yo'q (bo'sh ro'yxat).
   ========================================================================== */
export const catalogService: CatalogService = {
  listSpecialists: () => disabled(),
  getSpecialist: () => disabled(),
  listSellerReviews: () => call(async () => []),
  listCategories: () => call(async () => (await getCategories()).map((c) => c.slug as Model.ServiceCategory)),
};

/* Saqlangan (bookmark) — real backendda umuman yo'q */
export const savedService: SavedService = {
  listJobIds: () => disabled(),
  toggleJob: () => disabled(),
  listMarketIds: () => disabled(),
  toggleMarketItem: () => disabled(),
};

/* ==========================================================================
   SERVICES — sotuvchi CRUD + ochiq katalog. `fields`/`images`/`extras` kabi
   mock-only maydonlar real DTO'da yo'q — yozishda tashlanadi, o'qishda
   bo'sh/standart qiymat bilan to'ldiriladi.
   ========================================================================== */
export const servicesService: ServicesService = {
  listMine: () =>
    call(async () => {
      const categories = await getCategories();
      const page = await http<Page<RealService>>(`/seller/services${toQuery({ perPage: 100 })}`);
      return page.items.map((s) => mapService(s, slugById(categories, s.categoryId)));
    }),
  listPublic: () =>
    call(async () => {
      const categories = await getCategories();
      const page = await http<Page<RealPublicService>>(`/services${toQuery({ perPage: 100 })}`);
      return page.items.map((s) => mapPublicService(s, slugById(categories, s.categoryId)));
    }),
  get: (id) =>
    call(async () => {
      const categories = await getCategories();
      if (currentRole() === "mutaxassis") {
        try {
          const dto = await http<RealService>(`/seller/services/${id}`);
          return mapService(dto, slugById(categories, dto.categoryId));
        } catch (e) {
          if (!(e instanceof ApiError && e.code === "NOT_FOUND")) throw e;
        }
      }
      try {
        const dto = await http<RealPublicService>(`/services/${id}`);
        return mapPublicService(dto, slugById(categories, dto.categoryId));
      } catch (e) {
        if (e instanceof ApiError && e.code === "NOT_FOUND") return null;
        throw e;
      }
    }),
  create: (input) =>
    call(async () => {
      const categories = await getCategories();
      const categoryId = idBySlug(categories, input.category);
      if (!categoryId) throw new Error("VALIDATION");
      const dto = await http<RealService>("/seller/services", {
        method: "POST",
        body: {
          categoryId,
          title: input.title,
          description: input.description,
          price: input.price,
          deliveryDays: input.deliveryDays,
        },
      });
      return mapService(dto, input.category);
    }),
  update: (id, input) =>
    call(async () => {
      const categories = await getCategories();
      const body: Record<string, unknown> = {};
      if (input.title !== undefined) body.title = input.title;
      if (input.description !== undefined) body.description = input.description;
      if (input.price !== undefined) body.price = input.price;
      if (input.deliveryDays !== undefined) body.deliveryDays = input.deliveryDays;
      if (input.category !== undefined) {
        const categoryId = idBySlug(categories, input.category);
        if (categoryId) body.categoryId = categoryId;
      }
      const dto = await http<RealService>(`/seller/services/${id}`, { method: "PATCH", body });
      return mapService(dto, slugById(categories, dto.categoryId));
    }),
  /* Real backendda "o'chirish" yo'q — eng yaqin ekvivalent arxivlash */
  remove: (id) => call(async () => void (await http(`/seller/services/${id}/archive`, { method: "POST" }))),
  submit: (id) =>
    call(async () => {
      const categories = await getCategories();
      const dto = await http<RealService>(`/seller/services/${id}/submit`, { method: "POST" });
      return mapService(dto, slugById(categories, dto.categoryId));
    }),
  pause: (id) =>
    call(async () => {
      const categories = await getCategories();
      const dto = await http<RealService>(`/seller/services/${id}/pause`, { method: "POST" });
      return mapService(dto, slugById(categories, dto.categoryId));
    }),
  resume: (id) =>
    call(async () => {
      const categories = await getCategories();
      const dto = await http<RealService>(`/seller/services/${id}/resume`, { method: "POST" });
      return mapService(dto, slugById(categories, dto.categoryId));
    }),
};

/* Job/Proposal/Offer — "ikki yo'l" arxitekturasining B/A yo'llari real
   backendda umuman yo'q (faqat to'g'ridan-to'g'ri xizmat xaridi bor). */
export const jobsService: JobsService = {
  list: () => disabled(),
  get: () => disabled(),
  listMine: () => disabled(),
  create: () => disabled(),
  close: () => disabled(),
};

export const proposalsService: ProposalsService = {
  listMine: () => disabled(),
  get: () => disabled(),
  listForJob: () => disabled(),
  create: () => disabled(),
  setStatus: () => disabled(),
  hire: () => disabled(),
  withdraw: () => disabled(),
};

export const offersService: OffersService = {
  get: () => disabled(),
  create: () => disabled(),
  listSent: () => disabled(),
  listIncoming: () => disabled(),
  accept: () => disabled(),
  withdraw: () => disabled(),
  decline: () => disabled(),
};

/* ==========================================================================
   CONTRACTS + MILESTONES — real backend'ning asosiy oqimi.
   ========================================================================== */
export const contractsService: ContractsService = {
  list: () =>
    call(async () => {
      const role = currentRole();
      const base = role === "mutaxassis" ? "/seller/contracts" : "/me/contracts";
      const page = await http<Page<RealContract>>(`${base}${toQuery({ perPage: 100 })}`);
      return Promise.all(page.items.map((c) => hydrateContract(c, role)));
    }),
  get: (id) =>
    call(async () => {
      const role = currentRole();
      const base = role === "mutaxassis" ? "/seller/contracts" : "/me/contracts";
      try {
        const c = await http<RealContract>(`${base}/${id}`);
        return await hydrateContract(c, role);
      } catch (e) {
        if (e instanceof ApiError && e.code === "NOT_FOUND") return null;
        throw e;
      }
    }),
  create: (input, idempotencyKey) =>
    call(async () => {
      const c = await http<RealContract>("/contracts", { method: "POST", body: input, idempotencyKey });
      return hydrateContract(c, "xaridor");
    }),
  accept: (id) =>
    call(async () => {
      const c = await http<RealContract>(`/seller/contracts/${id}/accept`, { method: "POST" });
      return hydrateContract(c, "mutaxassis");
    }),
  reject: (id) =>
    call(async () => {
      const c = await http<RealContract>(`/seller/contracts/${id}/reject`, { method: "POST" });
      return hydrateContract(c, "mutaxassis");
    }),
  cancel: (id) =>
    call(async () => {
      const c = await http<RealContract>(`/me/contracts/${id}/cancel`, { method: "POST" });
      return hydrateContract(c, "xaridor");
    }),
  /* Ikki tomonlama "yopish so'rovi" oqimi real backendda yo'q — yakunlanish
     FAQAT oxirgi bosqich tasdiqlanganda avtomatik sodir bo'ladi. */
  requestClose: () => disabled(),
  approveClose: () => disabled(),
  sign: () => disabled(),
};

export const milestonesService: MilestonesService = {
  list: (contractId) =>
    call(async () => {
      const role = currentRole();
      const base = role === "mutaxassis" ? "/seller/contracts" : "/me/contracts";
      const c = await http<RealContract>(`${base}/${contractId}`);
      const hydrated = await hydrateContract(c, role);
      return c.milestones
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((m) => mapMilestone(m, !!hydrated.fundedAt));
    }),
  listMine: () =>
    call(async () => {
      const role = currentRole();
      const base = role === "mutaxassis" ? "/seller/contracts" : "/me/contracts";
      const page = await http<Page<RealContract>>(`${base}${toQuery({ perPage: 100 })}`);
      const results: Model.Milestone[] = [];
      for (const c of page.items) {
        const hydrated = await hydrateContract(c, role);
        for (const m of c.milestones) results.push(mapMilestone(m, !!hydrated.fundedAt));
      }
      return results;
    }),
  submit: (contractId, milestoneId, deliverable) =>
    call(async () => {
      const m = await http<RealMilestone>(`/seller/contracts/${contractId}/milestones/${milestoneId}/submit`, {
        method: "POST",
        body: {
          message: deliverable?.note,
          deliverableUrls: deliverable?.link ? [deliverable.link] : undefined,
        },
      });
      return mapMilestone(m, true);
    }),
  accept: (contractId, milestoneId) =>
    call(async () => {
      const m = await http<RealMilestone>(`/me/contracts/${contractId}/milestones/${milestoneId}/approve`, {
        method: "POST",
      });
      return mapMilestone(m, true);
    }),
  requestRevision: (contractId, milestoneId, comment) =>
    call(async () => {
      const m = await http<RealMilestone>(
        `/me/contracts/${contractId}/milestones/${milestoneId}/request-revision`,
        { method: "POST", body: { reason: comment } },
      );
      return mapMilestone(m, true);
    }),
};

/* Fayl yuklash — S3 presigned infratuzilmasi hali yo'q (backend Bosqich 5+) */
export const filesService: FilesService = {
  upload: () => disabled(),
};

/* ==========================================================================
   PAYMENTS — real Payme checkout oqimi + sotuvchi ledger balansi. Karta/
   yechish/B2B kabi mock-only usullar real backendda yo'q.
   ========================================================================== */
export const paymentsService: PaymentsService = {
  fundContract: () => disabled(),
  fundMilestone: () => disabled(),
  getBalance: () =>
    call(async () => {
      if (currentRole() !== "mutaxassis") return 0;
      const res = await http<{ currency: string; available: number }>("/seller/balance");
      return res.available;
    }),
  getCards: () => disabled(),
  addCard: () => disabled(),
  removeCard: () => disabled(),
  withdrawEarnings: () => disabled(),
  withdrawBalance: () => disabled(),
  getWithdrawnTotal: () => disabled(),
  getPendingWithdrawalTotal: () => disabled(),
  listMyWithdrawalRequests: () => disabled(),
  createContractPayment: (contractId, idempotencyKey) =>
    call(async () => mapPayment(await http<RealPayment>(`/me/contracts/${contractId}/payment`, { method: "POST", idempotencyKey }))),
  getContractPayment: (contractId) =>
    call(async () => {
      const page = await http<Page<RealPayment>>(`/me/payments${toQuery({ contractId, perPage: 1 })}`);
      const latest = page.items[0];
      return latest ? mapPayment(latest) : null;
    }),
};

/* Xabarlar/chat — real backendda Message modeli yo'q */
export const messagesService: MessagesService = {
  list: () => disabled(),
  listMine: () => disabled(),
  send: () => disabled(),
  getReadStatus: () => disabled(),
  markRead: () => disabled(),
};

/* Ichki bildirishnoma feed — real backendda yo'q (Outbox tashqi kanallarga — SMS/email — yetkazadi, UI feed emas) */
export const notificationsService: NotificationsService = {
  list: () => disabled(),
  markRead: () => disabled(),
  markAllRead: () => disabled(),
};

/* Sharhlar — real backendda Review modeli yo'q */
export const reviewsService: ReviewsService = {
  listMine: () => call(async () => []),
  getForContract: () => call(async () => null),
  create: () => disabled(),
};

/* ==========================================================================
   DISPUTES — real backend oqimi.
   ========================================================================== */
export const disputesService: DisputesService = {
  getForContract: (contractId) =>
    call(async () => {
      const page = await http<Page<RealDispute>>(`/me/disputes${toQuery({ perPage: 100 })}`);
      const match = page.items.find((d) => d.contractId === contractId);
      return match ? mapDispute(match) : null;
    }),
  open: (contractId, input) =>
    call(async () => {
      const d = await http<RealDispute>(`/me/contracts/${contractId}/disputes`, {
        method: "POST",
        body: { reason: input.reason.toUpperCase(), description: input.description },
        idempotencyKey: crypto.randomUUID(),
      });
      return mapDispute(d);
    }),
  withdraw: (contractId) =>
    call(async () => {
      const page = await http<Page<RealDispute>>(`/me/disputes${toQuery({ perPage: 100 })}`);
      const match = page.items.find((d) => d.contractId === contractId);
      if (!match) throw new Error("DISPUTE_NOT_FOUND");
      await http(`/me/disputes/${match.id}/cancel`, { method: "POST" });
    }),
};

export const sellerApplicationService: SellerApplicationService = {
  getCurrent: () =>
    call(async () => {
      try {
        const app = await http<RealSellerApplication>("/me/seller-application");
        return {
          status: mapSellerApplicationStatus(app.status),
          legalName: app.legalName,
          displayName: app.displayName,
          description: asStr(app.description),
          rejectionReason: asStr(app.rejectionReason),
        };
      } catch (e) {
        if (e instanceof ApiError && e.code === "NOT_FOUND") return null;
        throw e;
      }
    }),
  submit: (input) =>
    call(async () => {
      await http("/me/seller-application", { method: "POST", body: input });
    }),
};

/* KYC — real backendda yo'q */
export const verificationService: VerificationService = {
  getMine: () => disabled(),
  submit: () => disabled(),
};

/* Support ticketlar (mock) — real backendda yo'q. `supportRequestService`
   (pastda) BUTUNLAY BOSHQA, allaqachon real (/api/support) — bu bilan
   ALMASHTIRILMAYDI. */
export const supportService: SupportService = {
  listMine: () => disabled(),
  listReplies: () => disabled(),
  create: () => disabled(),
};

/* Yagona haqiqiy backend-integratsiyalangan service — mock-api'ga emas,
   /api/support route handler'ga (u yerdan Telegram Bot API'ga) haqiqiy
   fetch qiladi. Token bu faylga ham, brauzerga ham chiqmaydi. */
export const supportRequestService: SupportRequestService = {
  submit: (input) =>
    call(async () => {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) return;
      const body = await res.json().catch(() => null);
      if (body?.error === "VALIDATION") throw new Error("VALIDATION");
      if (body?.error === "RATE_LIMITED") throw new Error("RATE_LIMITED");
      throw new Error("SUPPORT_SEND_FAILED");
    }),
};

/**
 * Ma'lumot o'zgargani haqidagi signal. Real backend'da WebSocket/SSE yo'q
 * (bo'lim 91-K — "soxta realtime yo'q"), shuning uchun bu endi hech qachon
 * chiqarilmaydi — ekranlar `reload()`/fokusda qayta yuklash yoki bounded
 * polling bilan yangilanadi. `DATA_CHANGED_EVENT` nomi eski chaqiruv
 * joylari (`window.addEventListener(DATA_CHANGED_EVENT, ...)`) buzilmasin
 * deb saqlangan — hodisa shunchaki hech qachon `dispatchEvent` qilinmaydi.
 */
export const DATA_CHANGED_EVENT = "bobododa:data-changed";
export const resetDemoData = (): void => {};
