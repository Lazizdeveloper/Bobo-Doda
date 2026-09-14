/**
 * Bosqich 17 — anti-korruptsiya qatlami: real backend DTO'larini
 * `lib/types.ts`dagi (o'zbekcha) `Model.*` shakliga o'giradi. Bu fayl
 * `client.ts`ning ICHKI implementatsiya detali — UI uni hech qachon
 * to'g'ridan-to'g'ri import qilmaydi (`lib/api/README.md`dagi "UI faqat
 * @/lib/api dan import qiladi" qoidasi shu bilan buzilmaydi).
 *
 * Nega alohida fayl: `Model.*` interfeyslariga ~40+ komponent bog'liq —
 * ularni o'zgartirmaslik uchun tarjima mantig'i shu yerda TO'PLANGAN,
 * `client.ts` faqat HTTP chaqiruvi + shu funksiyalarni chaqiradi.
 */
import type * as Model from "@/lib/types";
import type { components } from "@bobododa/contracts";
import type { PaymentDTO } from "./contracts";

type RealService = components["schemas"]["ServiceResponseDto"];
type RealPublicService = components["schemas"]["PublicServiceResponseDto"];
type RealContract = components["schemas"]["ContractResponseDto"];
type RealMilestone = components["schemas"]["MilestoneResponseDto"];
type RealPayment = components["schemas"]["PaymentResponseDto"];
type RealDispute = components["schemas"]["DisputeResponseDto"];
type RealMe = components["schemas"]["MeResponseDto"];
type RealSellerApplication = components["schemas"]["SellerApplicationResponseDto"];

/**
 * `openapi-typescript` ba'zi `@ApiPropertyOptional({nullable:true})`
 * maydonlarini (aniq `type` ko'rsatilmagan joylarda) `Record<string,never>|
 * null` deb generatsiya qiladi — bu FAQAT generatsiya vaqtidagi tip
 * noaniqligi (`packages/contracts/src/openapi-types.ts`), haqiqiy javobda
 * bu maydonlar oddiy `string|null`. Runtime xavfsiz: qiymat string bo'lsa
 * qaytadi, aks holda `undefined`.
 */
export function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function roleToUz(role: "SELLER" | "BUYER" | null | undefined): Model.UserRole | null {
  if (role === "SELLER") return "mutaxassis";
  if (role === "BUYER") return "xaridor";
  return null;
}

export function roleToReal(role: Model.UserRole): "SELLER" | "BUYER" {
  return role === "mutaxassis" ? "SELLER" : "BUYER";
}

export function mapSellerApplicationStatus(status: RealSellerApplication["status"]): Model.VerificationStatus {
  switch (status) {
    case "APPROVED":
      return "tasdiqlangan";
    case "REJECTED":
      return "rad_etilgan";
    case "PENDING":
    default:
      return "korib_chiqilmoqda";
  }
}

export function mapUser(me: RealMe): Model.User {
  return {
    id: me.id,
    phone: me.phone,
    fullName: asStr(me.fullName) ?? "",
    role: roleToUz(me.activeRole) ?? "xaridor",
    createdAt: me.createdAt,
    roleChosen: me.roleChosen,
    profileDone: me.profileDone,
    verified: true,
    email: asStr(me.email),
  };
}

/**
 * Real backend'da boy sotuvchi profili (bio/skills/portfolio/rating/
 * reviewCount) UMUMAN YO'Q — faqat `fullName` + ariza snapshot'i bor.
 * Bo'sh/nol qiymatlar qaytariladi (SOXTA namoyish ma'lumoti EMAS — bu
 * "hali yo'q" degan HAQIQIY holat, foydalanuvchi hisobiga tegishli
 * o'ylab topilgan raqam emas).
 */
export function mapSellerProfile(me: RealMe, application?: RealSellerApplication | null): Model.SellerProfile {
  return {
    userId: me.id,
    headline: application?.displayName ?? asStr(me.fullName) ?? "",
    bio: asStr(application?.description) ?? "",
    skills: [],
    categories: [],
    location: "",
    languages: [],
    portfolio: [],
    responseTimeHours: 24,
    rating: 0,
    reviewCount: 0,
    completedContracts: 0,
    badge: "yangi",
    memberSince: me.createdAt,
    available: true,
    identityVerified: me.verified,
  };
}

function mapServiceStatus(status: RealService["status"]): Model.ServiceStatus {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "PENDING_REVIEW":
      return "pending_review";
    case "REJECTED":
      return "rejected";
    case "ARCHIVED":
      return "archived";
    case "PAUSED":
      return "paused";
    case "ACTIVE":
    default:
      return "active";
  }
}

export function mapService(s: RealService, categorySlug: string): Model.Service {
  return {
    id: s.id,
    sellerId: s.sellerId,
    category: categorySlug as Model.ServiceCategory,
    title: s.title,
    description: s.description,
    fields: {},
    price: s.price,
    currency: "UZS",
    deliveryDays: s.deliveryDays,
    images: [],
    status: mapServiceStatus(s.status),
    createdAt: s.createdAt,
  };
}

export function mapPublicService(s: RealPublicService, categorySlug: string): Model.Service {
  return {
    id: s.id,
    sellerId: s.sellerId,
    category: categorySlug as Model.ServiceCategory,
    title: s.title,
    description: s.description,
    fields: {},
    price: s.price,
    currency: "UZS",
    deliveryDays: s.deliveryDays,
    images: [],
    status: "active",
    createdAt: s.createdAt,
  };
}

function mapContractStatus(status: RealContract["status"]): Model.ContractStatus {
  switch (status) {
    case "PENDING_SELLER":
      return "imzolangan";
    case "ACTIVE":
      return "faol";
    case "COMPLETED":
      return "yakunlangan";
    case "CANCELLED":
    case "REJECTED":
    default:
      return "bekor_qilingan";
  }
}

/**
 * `funded` — shu shartnoma uchun SUCCEEDED to'lov bormi (chaqiruvchi
 * alohida `getContractPayment`/`listPayments` orqali aniqlab beradi —
 * `ContractResponseDto`ning o'zida bu ma'lumot yo'q). Shu qiymat orqali
 * `fundedAt` (mavjud maydon — CLAUDE.md: "undefined mavjud bo'lmagan
 * tarmoqni tabiiy o'chiradi") va bosqich holati ("mablaglangan" vs
 * "kutilmoqda") hisoblanadi.
 */
export function mapContract(
  c: RealContract,
  opts: { funded: boolean; fundedAt?: string; sellerName?: string; buyerName?: string },
): Model.Contract {
  return {
    id: c.id,
    sourceType: "xizmat",
    serviceId: c.serviceId,
    buyerId: c.buyerId,
    buyerName: opts.buyerName ?? "Xaridor",
    sellerId: c.sellerId,
    sellerName: opts.sellerName ?? c.sellerDisplayNameSnapshot,
    title: c.serviceTitleSnapshot,
    totalAmount: c.agreedAmount,
    status: mapContractStatus(c.status),
    createdAt: c.createdAt,
    paymentMethod: "payme",
    fundedAt: opts.funded ? opts.fundedAt : undefined,
    cancelReason: c.status === "REJECTED" ? "Mutaxassis taklifni rad etdi" : undefined,
  };
}

export function mapMilestone(m: RealMilestone, funded: boolean): Model.Milestone {
  let status: Model.MilestoneStatus;
  switch (m.status) {
    case "PENDING":
      status = "kutilmoqda";
      break;
    case "IN_PROGRESS":
      status = funded ? "mablaglangan" : "kutilmoqda";
      break;
    case "SUBMITTED":
      status = "topshirildi";
      break;
    case "REVISION_REQUESTED":
      status = "ozgartirish_soraldi";
      break;
    case "APPROVED":
    default:
      status = "qabul_qilindi";
      break;
  }
  return {
    id: m.id,
    contractId: m.contractId,
    title: m.title,
    description: asStr(m.description) ?? "",
    amount: m.amount,
    status,
    dueDate: asStr(m.dueAt) ?? m.createdAt,
    submittedAt: asStr(m.submittedAt),
    approvedAt: asStr(m.approvedAt),
  };
}

export function mapPayment(p: RealPayment): PaymentDTO {
  return {
    id: p.id,
    contractId: p.contractId,
    provider: p.provider,
    status: p.status,
    amount: p.amount,
    currency: "UZS",
    checkoutUrl: p.checkoutUrl,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function mapDisputeStatus(status: RealDispute["status"]): Model.Dispute["status"] {
  switch (status) {
    case "UNDER_REVIEW":
      return "korib_chiqilmoqda";
    case "RESOLVED":
    case "REJECTED":
    case "CANCELLED":
      return "hal_qilindi";
    case "OPEN":
    default:
      return "ochiq";
  }
}

export function mapDispute(d: RealDispute): Model.Dispute {
  return {
    id: d.id,
    contractId: d.contractId,
    /* Real backend ishtirokchi javobida "kim ochdi"ni qaytarmaydi — UI
       "qaytarib olish" tugmasini har doim ko'rsatadi, huquqi bo'lmasa
       server FORBIDDEN qaytaradi (`DisputeSummary.tsx` buni allaqachon
       maxsus xabar bilan ushlaydi). */
    openedBy: "",
    reason: d.reason.toLowerCase() as Model.Dispute["reason"],
    description: d.description,
    evidence: [],
    status: mapDisputeStatus(d.status),
    createdAt: d.openedAt,
    resolvedAt: asStr(d.resolvedAt),
    resolution: asStr(d.resolutionReason),
  };
}
