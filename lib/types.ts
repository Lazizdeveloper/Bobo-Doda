export type UserRole = "mutaxassis" | "xaridor";

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  /** MOCK: parol localStorage'da ochiq saqlanadi — real himoya faqat backend'da */
  password?: string;
  /* Onboarding holati hisobda ham saqlanadi — login'da sessiya tiklanadi */
  roleChosen?: boolean;
  profileDone?: boolean;
  verified?: boolean;
}

export type TrustBadge = "yangi" | "ishonchli" | "top_mutaxassis";
// yangi: standart | ishonchli: 5+ shartnoma va 4.5+ reyting
// top_mutaxassis: 25+ shartnoma va 4.8+ reyting

/** til bilish darajasi — i18n: lang.native | lang.fluent | lang.intermediate | lang.basic */
export type LanguageLevel = "native" | "fluent" | "intermediate" | "basic";

export interface ProfileLanguage {
  name: string;
  level: LanguageLevel;
}

/** Mutaxassis o'zi qo'shadigan bajarilgan ish namunasi */
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  /** muqova rasmi — base64 data-URL yoki URL */
  image: string;
  category?: ServiceCategory;
}

export interface SellerProfile {
  userId: string;
  /** kasbiy sarlavha (Upwork/Fiverr uslubidagi tagline) */
  headline: string;
  bio: string;
  skills: string[];
  categories: string[];
  location: string;
  languages: ProfileLanguage[];
  /** bajarilgan ishlar namunasi — xaridor ishonchi uchun */
  portfolio: PortfolioItem[];
  /** o'rtacha javob vaqti (soatda) — ishonch signali */
  responseTimeHours: number;
  rating: number;
  completedContracts: number;
  badge: TrustBadge;
  memberSince: string;
  /** yangi buyurtmalarga tayyorlik holati */
  available: boolean;
  /** band bo'lsa, qachon avtomatik "tayyor"ga qaytishi (ISO sana, ixtiyoriy) */
  availableUntil?: string;
  /** Shaxsi tasdiqlangan (KYC) — VerificationRecord.status'dan hisoblanadi,
      saqlanmaydi. Telegram `User.verified`dan farqli, real hujjat tekshiruvi. */
  identityVerified?: boolean;
  /** Yakunlangan / (yakunlangan + bekor qilingan) shartnomalar nisbati (0-100).
      Hisoblanadi, saqlanmaydi. Kamida 1 ta yakunlangan yoki bekor qilingan
      shartnoma bo'lmasa aniqlanmagan (undefined) — yangi hisob uchun 0%
      ko'rsatish chalg'ituvchi bo'lardi. */
  completionRate?: number;
}

export type ServiceCategory =
  | "dizayn"
  | "dasturlash"
  | "tarjima"
  | "kontent"
  | "marketing"
  | "video"
  | "audio"
  | "biznes";

export type ServiceStatus = "active" | "paused" | "draft";

/* A) Passiv yo'l — tayyor xizmat */
export interface Service {
  id: string;
  sellerId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  fields: Record<string, string | string[]>;
  price: number;
  currency: "UZS";
  deliveryDays: number;
  images: string[];
  status: ServiceStatus;
  createdAt: string;
  /** Narxga kiritilgan bepul tuzatishlar soni. Belgilanmasa (eski xizmatlar)
      cheklov qo'llanilmaydi — faqat shu maydon orqali va'da qilingan
      xizmatlarda tekshiriladi. */
  revisionsIncluded?: number;
  /** Narxga aynan nima kiritilgani — har bir xizmat uchun alohida, umumiy
      matn emas (masalan "Manba fayllar", "3 ta konseptsiya"). */
  included?: string[];
  /** Ishni boshlash uchun xaridordan nima talab qilinishi — har bir xizmat
      uchun alohida (masalan "Brendbuk", "Texnik topshiriq"). */
  requirements?: string[];
  /** Ixtiyoriy qo'shimcha xizmatlar (masalan "Tezkor topshirish" +qo'shimcha
      narx) — xaridor tanlab, asosiy narxga qo'shib taklif yuboradi. */
  extras?: { label: string; price: number }[];
}

/* B) Faol yo'l — xaridor e'lon qilgan ish (mock, faqat o'qish uchun) */
export type JobStatus = "ochiq" | "yopilgan";

export interface Job {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerRating: number;
  title: string;
  description: string;
  category: ServiceCategory;
  budgetMin: number;
  budgetMax: number;
  currency: "UZS";
  skillsRequired: string[];
  screeningQuestions: string[];
  proposalsCount: number;
  postedAt: string;
  status: JobStatus;
  /** Xaridor kutayotgan yakuniy muddat (ixtiyoriy) */
  deadline?: string;
  /** Loyiha uchun namuna/texnik topshiriq rasmlari (ixtiyoriy) */
  attachedImages?: string[];
}

export type ProposalStatus =
  | "yuborilgan"
  | "korib_chiqilmoqda"
  | "suhbat"
  | "yollandi"
  | "rad_etildi"
  | "qaytarib_olingan";

export interface Proposal {
  id: string;
  jobId: string;
  sellerId: string;
  bidAmount: number;
  coverLetter: string;
  screeningAnswers: { question: string; answer: string }[];
  attachedImages: string[];
  status: ProposalStatus;
  createdAt: string;
  /** Mutaxassis taxmin qilgan yetkazib berish muddati (kun) */
  estimatedDeliveryDays?: number;
}

/* To'g'ridan-to'g'ri taklif (xaridor → mutaxassis, to'lovsiz).
   Mutaxassis qabul qilsa shartnoma ochiladi; mablag'lash workroom'da. */
export type OfferStatus =
  | "yuborilgan"
  | "qabul_qilindi"
  | "rad_etildi"
  | "bekor_qilingan"; // xaridor o'zi qaytarib oldi

export interface Offer {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  /** xizmat sahifasidan yuborilgan bo'lsa */
  serviceId?: string;
  title: string;
  /** xaridorning boshlang'ich xabari (chat'da birinchi xabar sifatida ham boradi) */
  message: string;
  /** taklif qilinayotgan byudjet — to'lov emas, kelishuv boshlang'ich nuqtasi */
  budget: number;
  status: OfferStatus;
  /** qabul qilinganda ochilgan shartnoma */
  contractId?: string;
  createdAt: string;
}

/* Ikkala yo'l ham shu umumiy tuzilmaga keladi.
   imzolangan: taraflar rozi, shartnoma tuzilgan — lekin xaridor hali escrow'ga
   to'lamagan (ish boshlanmaydi). To'lov tushgach → faol. */
export type ContractStatus =
  | "imzolangan"
  | "faol"
  | "yakunlangan"
  | "bekor_qilingan"
  | "nizo";

export interface Contract {
  id: string;
  sourceType: "xizmat" | "taklif" | "taklifnoma";
  serviceId?: string;
  jobId?: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  /** denormalizatsiya — xaridor tomonida mutaxassis ismini ko'rsatish uchun */
  sellerName: string;
  title: string;
  totalAmount: number;
  status: ContractStatus;
  createdAt: string;
}

export type MilestoneStatus =
  | "kutilmoqda" // hali mablag'lanmagan
  | "mablaglangan" // escrow'da, ish boshlanishi mumkin
  | "topshirildi" // ko'rib chiqish muddati boshlandi
  | "qabul_qilindi" // tasdiqlandi, to'landi
  | "ozgartirish_soraldi"; // buyurtmachi o'zgartirish so'radi

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  dueDate: string;
  submittedAt?: string;
  reviewDeadline?: string; // submittedAt + 3 kun
  approvedAt?: string;
  /** buyurtmachi o'zgartirish so'raganda qoldirgan izohi */
  revisionComment?: string;
  /** Ushbu bosqichda nechta marta o'zgartirish so'ralgani */
  revisionCount?: number;
}

export interface Message {
  id: string;
  contractId: string;
  senderId: string;
  text: string;
  /** ixtiyoriy ilova — bitta rasm, base64 data-URL */
  image?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  contractId: string;
  /** sharh tegishli bo'lgan mutaxassis (egalik bo'yicha filtrlash uchun) */
  sellerId: string;
  /** sharh qoldirgan buyurtmachi ismi (ochiq profilda ko'rsatish uchun) */
  buyerName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/* Bank kartalari — mahalliy (Uzcard 8600, Humo 9860) + xalqaro (Visa, Mastercard).
   Xavfsizlik: to'liq raqam saqlanmaydi, faqat oxirgi 4 raqam + niqoblangan. */
export type CardType = "visa" | "mastercard" | "uzcard" | "humo";

export interface PaymentCard {
  id: string;
  userId: string;
  type: CardType;
  /** faqat oxirgi 4 raqam saqlanadi (PCI amaliyoti) */
  last4: string;
  holderName: string;
  /** "MM/YY" */
  expiry: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  role: UserRole | null;
  profileDone: boolean;
  /** akkount Telegram orqali tasdiqlangan (oqimning eng oxirgi bosqichi) */
  verified: boolean;
}

export type NotificationKind = "elon" | "taklif" | "bosqich" | "xabar" | "tolov";

export interface AppNotification {
  id: string;
  /** bildirishnoma egasi (foydalanuvchi bo'yicha filtrlash uchun) */
  userId: string;
  kind: NotificationKind;
  /** i18n kaliti; {param} o'rnini params to'ldiradi */
  messageKey: string;
  params?: Record<string, string>;
  href: string;
  read: boolean;
  createdAt: string;
}

export type VerificationStatus =
  | "boshlanmagan"
  | "korib_chiqilmoqda"
  | "tasdiqlangan"
  | "rad_etilgan";

export interface VerificationRecord {
  userId: string;
  status: VerificationStatus;
  country: "UZ" | "KZ" | "KG" | "TJ" | "TM";
  documentType: "passport" | "id_card";
  legalName: string;
  birthDate: string;
  documents: string[];
  submittedAt?: string;
  rejectionReason?: string;
}

export type SupportTopic =
  | "tolov"
  | "shartnoma"
  | "nizo"
  | "hisob"
  | "texnik"
  | "boshqa";

export interface SupportTicket {
  id: string;
  userId: string;
  topic: SupportTopic;
  subject: string;
  message: string;
  status: "ochiq" | "javob_berildi" | "yopilgan";
  createdAt: string;
}

/** In-site Support Modal — Telegram'ga sendMessage orqali yetkaziladigan
    yengil so'rov. `SupportTicket`dan farqli: localStorage'da saqlanmaydi,
    haqiqiy backend (`/api/support`) orqali support Telegram chatga boradi. */
export type SupportRequestCategory =
  | "tolov_escrow"
  | "loyiha"
  | "mutaxassis"
  | "profil"
  | "tasdiqlash"
  | "texnik"
  | "hisob"
  | "boshqa";

export interface SupportRequestInput {
  category: SupportRequestCategory;
  message: string;
  /** Guest uchun; login qilgan userda avtomatik session'dan olinadi */
  contactName?: string;
  contactInfo?: string;
  source: string;
  route: string;
}

export interface Dispute {
  id: string;
  contractId: string;
  openedBy: string;
  reason: "scope" | "quality" | "deadline" | "payment" | "communication" | "other";
  description: string;
  evidence: string[];
  status: "ochiq" | "korib_chiqilmoqda" | "hal_qilindi";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export function computeBadge(
  completedContracts: number,
  rating: number
): TrustBadge {
  if (completedContracts >= 25 && rating >= 4.8) return "top_mutaxassis";
  if (completedContracts >= 5 && rating >= 4.5) return "ishonchli";
  return "yangi";
}

/** Ochiq katalogdagi mutaxassis: hisob + sotuvchi profili */
export interface Specialist {
  user: User;
  profile: SellerProfile;
}

/** Bildirishnoma kanallari bo'yicha hisob sozlamalari */
export interface AccountPreferences {
  messages: boolean;
  contracts: boolean;
  payments: boolean;
  marketing: boolean;
}
