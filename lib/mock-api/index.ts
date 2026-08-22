import type {
  AccountPreferences,
  AppNotification,
  Contract,
  Job,
  Message,
  Milestone,
  NotificationKind,
  Offer,
  PaymentCard,
  PortfolioItem,
  ProfileLanguage,
  Proposal,
  Review,
  SellerProfile,
  Service,
  Session,
  Specialist,
  SupportTicket,
  User,
  UserRole,
  VerificationRecord,
  Dispute,
} from "@/lib/types";
import { computeBadge } from "@/lib/types";
export type { AccountPreferences, Specialist } from "@/lib/types";
import {
  amount,
  cardExpiry,
  cardNumber,
  LIMITS,
  safeHref,
  text,
  textList,
} from "@/lib/validate";
import {
  assertTransition,
  contractMachine,
  jobMachine,
  milestoneMachine,
  offerMachine,
  proposalMachine,
} from "@/lib/api/state-machines";
import {
  BUYER_ID,
  SELLER_ID,
  seedContracts,
  seedJobs,
  seedMessages,
  seedMilestones,
  seedNotifications,
  seedOfferMessages,
  seedOffers,
  seedProfiles,
  seedProposals,
  seedReviews,
  seedServices,
  seedUsers,
} from "./seed";

/* v2: milestone-escrow arxitekturasi — eski sb_* kalitlardan ajratilgan */
const KEYS = {
  users: "sb2_users",
  profiles: "sb2_profiles",
  services: "sb2_services",
  jobs: "sb2_jobs",
  proposals: "sb2_proposals",
  offers: "sb2_offers",
  contracts: "sb2_contracts",
  milestones: "sb2_milestones",
  messages: "sb2_messages",
  reviews: "sb2_reviews",
  notifications: "sb2_notifications",
  savedJobs: "sb2_saved_jobs",
  savedMarket: "sb2_saved_market",
  verifications: "sb2_verifications",
  supportTickets: "sb2_support_tickets",
  disputes: "sb2_disputes",
  preferences: "sb2_preferences",
  balances: "sb2_balances",
  withdrawn: "sb2_withdrawn",
  cards: "sb2_cards",
  session: "sb_session",
  seeded: "sb2_seeded",
} as const;

export const DATA_CHANGED_EVENT = "bobododa:data-changed";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isQuotaError(err: unknown): boolean {
  /* Brauzerlar bo'ylab ishonchli: nom yoki kod (22 / 1014) bo'yicha */
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: number };
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new CustomEvent(DATA_CHANGED_EVENT, { detail: { key } })
    );
  } catch (err) {
    /* localStorage kvotasi to'lsa app qulab tushmasin — toza xato qaytadi */
    if (isQuotaError(err)) throw new Error("STORAGE_FULL");
    throw err;
  }
}

/* v6: Rich interconnected operations seed */
const SEED_VERSION = "10";

function ensureSeed(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.seeded) !== SEED_VERSION) {
    write(KEYS.users, seedUsers);
    write(KEYS.profiles, seedProfiles);
    write(KEYS.services, seedServices);
    write(KEYS.jobs, seedJobs);
    write(KEYS.proposals, seedProposals);
    write(KEYS.offers, seedOffers);
    write(KEYS.contracts, seedContracts);
    write(KEYS.milestones, seedMilestones);
    write(KEYS.messages, [...seedMessages, ...seedOfferMessages]);
    write(KEYS.reviews, seedReviews);
    write(KEYS.notifications, seedNotifications);
    /* Eski versiya sessiyasi endi mavjud bo'lmagan hisobga ishora qilishi mumkin */
    window.localStorage.removeItem(KEYS.session);
    window.localStorage.setItem(KEYS.seeded, SEED_VERSION);
  }
}

/* Escrow qoidasi: ko'rib chiqish muddati o'tgan bosqichlar avtomatik qabul
   qilinadi (faqat faol shartnomalarda); barcha bosqichlar qabul qilingan
   shartnoma yakunlanadi. */
function applyEscrowRules(): void {
  if (typeof window === "undefined") return;
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const now = Date.now();
  let msChanged = false;
  let cChanged = false;

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    if (m.status !== "topshirildi" || !m.reviewDeadline) continue;
    if (new Date(m.reviewDeadline).getTime() > now) continue;
    const contract = contracts.find((c) => c.id === m.contractId);
    if (contract?.status !== "faol") continue;
    milestones[i] = {
      ...m,
      status: "qabul_qilindi",
      approvedAt: m.reviewDeadline,
    };
    msChanged = true;
    pushNotification(contract.sellerId, "bosqich", "ntf.milestoneAutoAccepted", `/mutaxassis/shartnomalar/${m.contractId}`, { title: m.title });
    pushNotification(contract.buyerId, "bosqich", "ntf.milestoneAutoAccepted", `/xaridor/shartnomalar/${m.contractId}`, { title: m.title });
  }

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    if (c.status !== "faol") continue;
    const own = milestones.filter((m) => m.contractId === c.id);
    if (own.length > 0 && own.every((m) => m.status === "qabul_qilindi")) {
      contracts[i] = { ...c, status: "yakunlangan" };
      cChanged = true;
    }
  }

  if (msChanged) write(KEYS.milestones, milestones);
  if (cChanged) write(KEYS.contracts, contracts);
}

function pushNotification(
  userId: string,
  kind: NotificationKind,
  messageKey: string,
  href: string,
  params?: Record<string, string>
): void {
  const notifications = read<AppNotification[]>(KEYS.notifications, []);
  notifications.push({
    id: uid("n"),
    userId,
    kind,
    messageKey,
    params,
    href: safeHref(href),
    read: false,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.notifications, notifications);
}

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  /* Taxmin qilinmaydigan id — crypto.randomUUID (mavjud bo'lmasa zaxira) */
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${rand}`;
}

/* ---------------- Sessiya / autentifikatsiya (mock) ---------------- */

export function getSession(): Session | null {
  ensureSeed();
  const session = read<Session | null>(KEYS.session, null);
  if (!session) return null;
  if (read<string[]>("sb2_blocked_users", []).includes(session.userId)) {
    window.localStorage.removeItem(KEYS.session);
    return null;
  }
  /* Eski (verified maydonisiz) sessiyalarni tasdiqlangan deb qabul qilamiz */
  return { ...session, verified: session.verified ?? true };
}

/** Joriy sessiya foydalanuvchisi. Data API anonim demo hisobga tushib qolmaydi. */
function currentUserId(): string {
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  return session.userId;
}

/** Shartnoma bo'yicha funksiyalar rolga qarab filtrlanadi */
function isBuyerSession(): boolean {
  return getSession()?.role === "xaridor";
}

/** Joriy foydalanuvchiga tegishli shartnomalar id to'plami (rolga mos tomondan) */
function myContractIds(): Set<string> {
  const uid = currentUserId();
  const asBuyer = isBuyerSession();
  return new Set(
    read<Contract[]>(KEYS.contracts, [])
      .filter((c) => (asBuyer ? c.buyerId === uid : c.sellerId === uid))
      .map((c) => c.id)
  );
}

function isThreadParticipant(threadId: string, userId: string): boolean {
  const contract = read<Contract[]>(KEYS.contracts, []).find((item) => item.id === threadId);
  if (contract) return contract.buyerId === userId || contract.sellerId === userId;
  const offer = read<Offer[]>(KEYS.offers, []).find((item) => item.id === threadId);
  return !!offer && (offer.buyerId === userId || offer.sellerId === userId);
}

/** Yangi ro'yxatdan o'tgan mutaxassis uchun bo'sh profil */
function emptyProfile(userId: string): SellerProfile {
  return {
    userId,
    headline: "",
    bio: "",
    skills: [],
    categories: [],
    location: "",
    languages: [],
    portfolio: [],
    responseTimeHours: 0,
    rating: 0,
    completedContracts: 0,
    badge: "yangi",
    memberSince: new Date().toISOString(),
    available: true,
  };
}

/** Telefon raqamini solishtirish uchun bir xil ko'rinishga keltiradi */
function normalizePhone(raw: unknown): string {
  return text(raw, LIMITS.phone).replace(/[\s-]/g, "");
}

/* Ro'yxatdan o'tish: yangi, BO'SH hisob ochiladi (demo seed'dan ajratilgan).
   Telegram tasdiqlash oqimning eng oxirida. Telefon raqami unikal. */
export async function register(data: {
  fullName: string;
  phone: string;
  password: string;
}): Promise<Session> {
  ensureSeed();
  await delay(500);
  const system = read<{ registration?: boolean }>("sb2_system_settings", {});
  if (system.registration === false) throw new Error("REGISTRATION_PAUSED");
  const phone = normalizePhone(data.phone);
  const password = text(data.password, LIMITS.password);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("WEAK_PASSWORD");
  }
  const users = read<User[]>(KEYS.users, []);
  if (users.some((u) => normalizePhone(u.phone) === phone)) {
    throw new Error("PHONE_EXISTS");
  }
  const newId = uid("u");
  users.push({
    id: newId,
    phone,
    fullName: text(data.fullName, LIMITS.name),
    role: "mutaxassis",
    password,
    roleChosen: false,
    profileDone: false,
    verified: false,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.users, users);

  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  profiles[newId] = emptyProfile(newId);
  write(KEYS.profiles, profiles);

  const session: Session = {
    userId: newId,
    role: null,
    profileDone: false,
    verified: false,
  };
  write(KEYS.session, session);
  return session;
}

/** Tizimga kirish: telefon + parol. Onboarding qayerda to'xtagan bo'lsa,
   sessiya o'sha holatdan tiklanadi (rol → profil → tasdiqlash). */
export async function login(data: {
  phone: string;
  password: string;
}): Promise<Session> {
  ensureSeed();
  await delay(500);
  const phone = normalizePhone(data.phone);
  const users = read<User[]>(KEYS.users, []);
  const user = users.find((u) => normalizePhone(u.phone) === phone);
  /* Bir xil xato — telefon bazada bormi-yo'qmi oshkor qilinmaydi */
  if (!user || !user.password || user.password !== data.password) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (read<string[]>("sb2_blocked_users", []).includes(user.id)) {
    throw new Error("ACCOUNT_BLOCKED");
  }
  const session: Session = {
    userId: user.id,
    role: user.roleChosen ? user.role : null,
    profileDone: !!user.profileDone,
    verified: !!user.verified,
  };
  write(KEYS.session, session);
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resetPassword(_input: { phone: string; code: string; newPassword: string }): Promise<void> {
  await delay(800);
  // Mock implementation: always succeed
}

/** Oxirgi bosqich: akkountni Telegram orqali tasdiqlash (istalgan 6 xonali kod) */
export async function verifyTelegram(code: string): Promise<Session> {
  await delay(600);
  if (!/^\d{6}$/.test(code)) throw new Error("INVALID_CODE");
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  /* Hisob yozuvida ham saqlanadi — keyingi login'da qayta so'ralmasin */
  const users = read<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], verified: true };
    write(KEYS.users, users);
  }
  const updated: Session = { ...session, verified: true };
  write(KEYS.session, updated);
  return updated;
}

export async function chooseRole(role: UserRole): Promise<Session> {
  await delay(300);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  /* Foydalanuvchi yozuvidagi rol ham yangilanadi — sessiya bilan mos bo'lsin */
  const users = read<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], role, roleChosen: true };
    write(KEYS.users, users);
  }
  const updated: Session = { ...session, role };
  write(KEYS.session, updated);
  return updated;
}

export async function completeSellerProfile(data: {
  fullName: string;
  bio: string;
  skills: string[];
  categories: string[];
  location: string;
}): Promise<void> {
  await delay(500);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");

  const users = read<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      fullName: text(data.fullName, LIMITS.name),
      role: "mutaxassis",
      profileDone: true,
    };
    write(KEYS.users, users);
  }

  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  const profile = profiles[session.userId] ?? emptyProfile(session.userId);
  profiles[session.userId] = {
    ...profile,
    userId: session.userId,
    bio: text(data.bio, LIMITS.bio),
    skills: textList(data.skills, 30, LIMITS.skill),
    categories: textList(data.categories, 8, LIMITS.skill),
    location: text(data.location, LIMITS.location),
    badge: computeBadge(profile.completedContracts, profile.rating),
  };
  write(KEYS.profiles, profiles);

  write(KEYS.session, { ...session, profileDone: true });
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.session);
}

/* ---------------- Foydalanuvchi / profil ---------------- */

export async function getCurrentUser(): Promise<User | null> {
  ensureSeed();
  await delay(150);
  const session = getSession();
  if (!session) return null;
  const users = read<User[]>(KEYS.users, []);
  return users.find((u) => u.id === session.userId) ?? null;
}

export async function getSellerProfile(): Promise<SellerProfile> {
  ensureSeed();
  await delay(200);
  const userId = currentUserId();
  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  return profiles[userId] ?? emptyProfile(userId);
}

export async function setAvailability(available: boolean): Promise<void> {
  await delay(250);
  const userId = currentUserId();
  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  profiles[userId] = { ...(profiles[userId] ?? emptyProfile(userId)), available };
  write(KEYS.profiles, profiles);
}

export async function updateSellerProfile(data: {
  fullName: string;
  bio: string;
  headline?: string;
  skills?: string[];
  location?: string;
  languages?: ProfileLanguage[];
  portfolio?: PortfolioItem[];
}): Promise<void> {
  await delay(400);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");

  const users = read<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], fullName: text(data.fullName, LIMITS.name) };
    write(KEYS.users, users);
  }

  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  const profile = profiles[session.userId] ?? emptyProfile(session.userId);
  /* Til va portfolio elementlarini ham tozalaymiz (uzunlik/soni chegarasi) */
  const languages = (data.languages ?? profile.languages)
    .slice(0, 15)
    .map((l) => ({ name: text(l.name, LIMITS.langName), level: l.level }))
    .filter((l) => l.name);
  const portfolio = (data.portfolio ?? profile.portfolio)
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      title: text(p.title, LIMITS.title),
      description: text(p.description, LIMITS.description),
      image: p.image,
      category: p.category,
    }));
  profiles[session.userId] = {
    ...profile,
    headline: text(data.headline ?? profile.headline, LIMITS.headline),
    bio: text(data.bio, LIMITS.bio),
    skills: data.skills ? textList(data.skills, 30, LIMITS.skill) : profile.skills,
    location: text(data.location ?? profile.location, LIMITS.location),
    languages,
    portfolio,
  };
  write(KEYS.profiles, profiles);
}

/* ---------------- Xizmatlar (A yo'l) ---------------- */

export async function getServices(): Promise<Service[]> {
  ensureSeed();
  await delay();
  const uid = currentUserId();
  const services = read<Service[]>(KEYS.services, []);
  return services
    .filter((s) => s.sellerId === uid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getService(id: string): Promise<Service | null> {
  ensureSeed();
  await delay(200);
  const services = read<Service[]>(KEYS.services, []);
  return services.find((s) => s.id === id) ?? null;
}

export async function createService(
  data: Omit<Service, "id" | "sellerId" | "currency" | "createdAt">
): Promise<Service> {
  await delay(500);
  const session = getSession();
  if (!session || session.role !== "mutaxassis") throw new Error("FORBIDDEN");
  const service: Service = {
    ...data,
    title: text(data.title, LIMITS.title),
    description: text(data.description, LIMITS.description),
    fields: sanitizeFields(data.fields),
    price: amount(data.price),
    deliveryDays: amount(data.deliveryDays, { min: 1, max: 365 }),
    images: (data.images ?? []).slice(0, 10),
    id: uid("s"),
    sellerId: session.userId,
    currency: "UZS",
    createdAt: new Date().toISOString(),
  };
  const services = read<Service[]>(KEYS.services, []);
  services.push(service);
  write(KEYS.services, services);
  return service;
}

/** Xizmat maydonlari (kategoriyaga xos) — kalit va qiymatlarni cheklaydi */
function sanitizeFields(
  fields: Record<string, string | string[]> | undefined
): Record<string, string | string[]> {
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(fields).slice(0, 20)) {
    const k = text(key, 60);
    if (!k) continue;
    out[k] = Array.isArray(value)
      ? textList(value, 20, LIMITS.fieldValue)
      : text(value, LIMITS.fieldValue);
  }
  return out;
}

export async function updateService(
  id: string,
  data: Partial<Omit<Service, "id" | "sellerId" | "createdAt">>
): Promise<Service> {
  await delay(500);
  const services = read<Service[]>(KEYS.services, []);
  /* Egalik tekshiruvi — faqat o'z xizmatini o'zgartirish mumkin */
  const idx = services.findIndex(
    (s) => s.id === id && s.sellerId === currentUserId()
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  /* Faqat ruxsat etilgan maydonlar, har biri validatsiyadan o'tadi */
  const clean: Partial<Service> = {};
  if (data.title !== undefined) clean.title = text(data.title, LIMITS.title);
  if (data.description !== undefined)
    clean.description = text(data.description, LIMITS.description);
  if (data.fields !== undefined) clean.fields = sanitizeFields(data.fields);
  if (data.price !== undefined) clean.price = amount(data.price);
  if (data.deliveryDays !== undefined)
    clean.deliveryDays = amount(data.deliveryDays, { min: 1, max: 365 });
  if (data.images !== undefined) clean.images = data.images.slice(0, 10);
  if (data.category !== undefined) clean.category = data.category;
  if (data.status !== undefined) clean.status = data.status;
  services[idx] = { ...services[idx], ...clean };
  write(KEYS.services, services);
  return services[idx];
}

export async function deleteService(id: string): Promise<void> {
  await delay(300);
  const uid2 = currentUserId();
  const services = read<Service[]>(KEYS.services, []);
  write(
    KEYS.services,
    services.filter((s) => !(s.id === id && s.sellerId === uid2))
  );
}

/* ---------------- Ish e'lonlari (B yo'l, faqat o'qish) ---------------- */

export async function getJobs(): Promise<Job[]> {
  ensureSeed();
  await delay();
  return read<Job[]>(KEYS.jobs, []);
}

export async function getJob(id: string): Promise<Job | null> {
  ensureSeed();
  await delay(200);
  const jobs = read<Job[]>(KEYS.jobs, []);
  return jobs.find((j) => j.id === id) ?? null;
}

/* ---------------- Takliflar ---------------- */

export async function getProposals(): Promise<Proposal[]> {
  ensureSeed();
  await delay();
  const uid = currentUserId();
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  return proposals
    .filter((p) => p.sellerId === uid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createProposal(data: {
  jobId: string;
  bidAmount: number;
  coverLetter: string;
  screeningAnswers: { question: string; answer: string }[];
  attachedImages: string[];
}): Promise<Proposal> {
  await delay(500);
  const session = getSession();
  if (!session || session.role !== "mutaxassis") throw new Error("FORBIDDEN");
  const sellerId = session.userId;
  const job = read<Job[]>(KEYS.jobs, []).find((item) => item.id === data.jobId);
  if (!job || job.status !== "ochiq" || job.buyerId === sellerId) {
    throw new Error("NOT_FOUND");
  }
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  /* Bir ishga bitta faol taklif — qaytarib olingan bo'lsagina qayta yuborish
     mumkin (Upwork/Fiverr amaliyoti). To'g'ridan-to'g'ri URL orqali kirishdan
     ham himoya qiladi. */
  const hasActive = proposals.some(
    (p) =>
      p.jobId === data.jobId &&
      p.sellerId === sellerId &&
      p.status !== "qaytarib_olingan"
  );
  if (hasActive) throw new Error("DUPLICATE_PROPOSAL");
  const proposal: Proposal = {
    jobId: data.jobId,
    bidAmount: amount(data.bidAmount),
    coverLetter: text(data.coverLetter, LIMITS.coverLetter),
    screeningAnswers: (data.screeningAnswers ?? [])
      .slice(0, 10)
      .map((qa) => ({
        question: text(qa.question, LIMITS.question),
        answer: text(qa.answer, LIMITS.answer),
      })),
    attachedImages: (data.attachedImages ?? []).slice(0, 10),
    id: uid("p"),
    sellerId,
    status: "yuborilgan",
    createdAt: new Date().toISOString(),
  };
  proposals.push(proposal);
  write(KEYS.proposals, proposals);

  const jobs = read<Job[]>(KEYS.jobs, []);
  const idx = jobs.findIndex((j) => j.id === data.jobId);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], proposalsCount: jobs[idx].proposalsCount + 1 };
    write(KEYS.jobs, jobs);
    pushNotification(
      jobs[idx].buyerId,
      "taklif",
      "ntf.newProposal",
      `/xaridor/elonlarim/${jobs[idx].id}`,
      { title: jobs[idx].title }
    );
  }
  return proposal;
}

/* ---------------- Shartnomalar ---------------- */

export async function getContracts(): Promise<Contract[]> {
  ensureSeed();
  applyEscrowRules();
  await delay();
  const uid = currentUserId();
  const asBuyer = isBuyerSession();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  return contracts
    .filter((c) => (asBuyer ? c.buyerId === uid : c.sellerId === uid))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getContract(id: string): Promise<Contract | null> {
  ensureSeed();
  applyEscrowRules();
  await delay(200);
  const uid = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const contract = contracts.find((c) => c.id === id);
  /* Egalik tekshiruvi — faqat shartnoma tomonlari ochishi mumkin */
  return contract && (contract.sellerId === uid || contract.buyerId === uid)
    ? contract
    : null;
}

/** Shartnomani bekor qilish (ikkala tomon ham qila oladi — imzolangan yoki
   faol). Tekshiruvdagi ish bo'lsa bloklanadi; escrow'dagi (mablag'langan,
   hali qabul qilinmagan) pul xaridorning Bobo&Doda hisobiga QAYTARILADI —
   u yerdan kartaga yechib oladi. Qabul qilingan bosqichlar to'langanicha qoladi. */
export async function cancelContract(id: string): Promise<Contract> {
  await delay(500);
  const uid2 = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const idx = contracts.findIndex(
    (c) =>
      c.id === id &&
      (c.status === "faol" || c.status === "imzolangan") &&
      (c.buyerId === uid2 || c.sellerId === uid2)
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const contract = contracts[idx];

  const milestones = read<Milestone[]>(KEYS.milestones, []);
  const own = milestones.filter((m) => m.contractId === id);
  if (
    own.some(
      (m) => m.status === "topshirildi" || m.status === "ozgartirish_soraldi"
    )
  ) {
    throw new Error("HAS_SUBMITTED_WORK");
  }

  /* Mablag'langan (escrow'dagi, hali qabul qilinmagan) summa qaytariladi */
  const refund = own
    .filter((m) => m.status === "mablaglangan")
    .reduce((sum, m) => sum + m.amount, 0);
  if (refund > 0) creditBalance(contract.buyerId, refund);

  assertTransition(
    contractMachine,
    contract.status,
    "bekor_qilingan",
    uid2 === contract.buyerId ? "buyer" : "seller"
  );
  /* Escrow qaytarilgach child holati funded bo'lib qolmasligi kerak. */
  if (refund > 0) {
    write(
      KEYS.milestones,
      milestones.map((milestone) =>
        milestone.contractId === id && milestone.status === "mablaglangan"
          ? { ...milestone, status: "kutilmoqda" as const }
          : milestone
      )
    );
  }
  contracts[idx] = { ...contract, status: "bekor_qilingan" };
  write(KEYS.contracts, contracts);

  const byBuyer = uid2 === contract.buyerId;
  pushNotification(
    byBuyer ? contract.sellerId : contract.buyerId,
    "bosqich",
    "ntf.contractCancelled",
    `${byBuyer ? "/mutaxassis" : "/xaridor"}/shartnomalar/${id}`,
    { title: contract.title }
  );
  return contracts[idx];
}

/* ---------------- Bosqichlar ---------------- */

export async function getMilestones(contractId: string): Promise<Milestone[]> {
  ensureSeed();
  applyEscrowRules();
  await delay(200);
  if (!myContractIds().has(contractId)) throw new Error("NOT_FOUND");
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  return milestones.filter((m) => m.contractId === contractId);
}

export async function getAllMilestones(): Promise<Milestone[]> {
  ensureSeed();
  applyEscrowRules();
  await delay();
  const mine = myContractIds();
  return read<Milestone[]>(KEYS.milestones, []).filter((m) =>
    mine.has(m.contractId)
  );
}

/** Ishni topshirish: holat 'topshirildi', 3 kunlik ko'rib chiqish boshlanadi */
export async function submitMilestone(id: string): Promise<Milestone> {
  await delay(400);
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  const idx = milestones.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("NOT_FOUND");
  /* Egalik tekshiruvi — faqat shartnoma mutaxassisi topshira oladi */
  const ownContract = read<Contract[]>(KEYS.contracts, []).find(
    (c) => c.id === milestones[idx].contractId && c.sellerId === currentUserId()
  );
  if (!ownContract) throw new Error("NOT_FOUND");
  if (ownContract.status !== "faol") throw new Error("BAD_STATE");
  /* Faqat mablag'langan yoki qayta ishlanayotgan bosqichni topshirish mumkin —
     to'lanmagan (kutilmoqda) bosqich topshirilmaydi */
  assertTransition(milestoneMachine, milestones[idx].status, "topshirildi", "seller");
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 3);
  milestones[idx] = {
    ...milestones[idx],
    status: "topshirildi",
    submittedAt: now.toISOString(),
    reviewDeadline: deadline.toISOString(),
    revisionComment: undefined,
  };
  write(KEYS.milestones, milestones);

  const contract = read<Contract[]>(KEYS.contracts, []).find(
    (c) => c.id === milestones[idx].contractId
  );
  if (contract) {
    pushNotification(
      contract.buyerId,
      "bosqich",
      "ntf.milestoneSubmitted",
      `/xaridor/shartnomalar/${contract.id}`,
      { title: milestones[idx].title }
    );
  }
  return milestones[idx];
}

/* ---------------- Xabarlar ---------------- */

export async function getMessages(contractId: string): Promise<Message[]> {
  ensureSeed();
  await delay(200);
  const userId = currentUserId();
  if (!isThreadParticipant(contractId, userId)) throw new Error("NOT_FOUND");
  const messages = read<Message[]>(KEYS.messages, []);
  return messages
    .filter((m) => m.contractId === contractId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllMessages(): Promise<Message[]> {
  ensureSeed();
  await delay();
  const mine = myContractIds();
  return read<Message[]>(KEYS.messages, []).filter((m) =>
    mine.has(m.contractId)
  );
}

export async function sendMessage(
  contractId: string,
  body: string
): Promise<Message> {
  await delay(300);
  const clean = text(body, LIMITS.message);
  if (!clean) throw new Error("EMPTY_MESSAGE");
  const senderId = currentUserId();
  if (!isThreadParticipant(contractId, senderId)) throw new Error("NOT_FOUND");
  const message: Message = {
    id: uid("m"),
    contractId,
    senderId,
    text: clean,
    createdAt: new Date().toISOString(),
  };
  const messages = read<Message[]>(KEYS.messages, []);
  messages.push(message);
  write(KEYS.messages, messages);

  /* Qarshi tomonga bildirishnoma (oqim shartnoma yoki taklif bo'lishi mumkin) */
  const users = read<User[]>(KEYS.users, []);
  const senderName = users.find((u) => u.id === senderId)?.fullName ?? "";
  const contract = read<Contract[]>(KEYS.contracts, []).find(
    (c) => c.id === contractId
  );
  if (contract) {
    const toBuyer = senderId === contract.sellerId;
    pushNotification(
      toBuyer ? contract.buyerId : contract.sellerId,
      "xabar",
      "ntf.newMessage",
      `${toBuyer ? "/xaridor" : "/mutaxassis"}/shartnomalar/${contractId}`,
      { name: senderName }
    );
  } else {
    const offer = read<Offer[]>(KEYS.offers, []).find((o) => o.id === contractId);
    if (offer) {
      const toBuyer = senderId === offer.sellerId;
      pushNotification(
        toBuyer ? offer.buyerId : offer.sellerId,
        "xabar",
        "ntf.newMessage",
        toBuyer
          ? `/xaridor/takliflarim/${offer.id}`
          : `/mutaxassis/takliflarim/kelgan/${offer.id}`,
        { name: senderName }
      );
    }
  }
  return message;
}

/* ---------------- Sharhlar ---------------- */

export async function getReviews(): Promise<Review[]> {
  ensureSeed();
  await delay(200);
  const uid = currentUserId();
  return read<Review[]>(KEYS.reviews, []).filter((r) => r.sellerId === uid);
}

export async function getReviewByContract(
  contractId: string
): Promise<Review | null> {
  ensureSeed();
  await delay(150);
  const reviews = read<Review[]>(KEYS.reviews, []);
  return reviews.find((r) => r.contractId === contractId) ?? null;
}

/* ---------------- Bildirishnomalar ---------------- */

export async function getNotifications(): Promise<AppNotification[]> {
  ensureSeed();
  await delay(150);
  const uid = currentUserId();
  const notifications = read<AppNotification[]>(KEYS.notifications, []);
  return notifications
    .filter((n) => n.userId === uid)
    /* Buzilgan ma'lumotdan himoya: href faqat ichki yo'l bo'lsin (open redirect) */
    .map((n) => ({ ...n, href: safeHref(n.href) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay(100);
  const notifications = read<AppNotification[]>(KEYS.notifications, []);
  write(
    KEYS.notifications,
    notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(150);
  const uid = currentUserId();
  const notifications = read<AppNotification[]>(KEYS.notifications, []);
  write(
    KEYS.notifications,
    notifications.map((n) => (n.userId === uid ? { ...n, read: true } : n))
  );
}

/* ---------------- Saqlangan e'lonlar ---------------- */

export async function getSavedJobIds(): Promise<string[]> {
  ensureSeed();
  await delay(100);
  const uid = currentUserId();
  const saved = read<Record<string, string[]> | string[]>(KEYS.savedJobs, {});
  /* v8 gacha saqlanganlar umumiy massiv edi. Endi har bir hisob alohida. */
  return Array.isArray(saved) ? saved : saved[uid] ?? [];
}

export async function toggleSavedJob(jobId: string): Promise<string[]> {
  await delay(150);
  const uid = currentUserId();
  const stored = read<Record<string, string[]> | string[]>(KEYS.savedJobs, {});
  const byUser = Array.isArray(stored) ? { [uid]: stored } : stored;
  const saved = byUser[uid] ?? [];
  const next = saved.includes(jobId)
    ? saved.filter((id) => id !== jobId)
    : [...saved, jobId];
  write(KEYS.savedJobs, { ...byUser, [uid]: next });
  return next;
}

/* ---------------- Xaridor saqlagan xizmat va mutaxassislar ---------------- */

export async function getSavedMarketIds(): Promise<string[]> {
  ensureSeed();
  await delay(100);
  const uid = currentUserId();
  const saved = read<Record<string, string[]>>(KEYS.savedMarket, {});
  return saved[uid] ?? [];
}

export async function toggleSavedMarketItem(id: string): Promise<string[]> {
  await delay(150);
  const uid = currentUserId();
  const saved = read<Record<string, string[]>>(KEYS.savedMarket, {});
  const mine = saved[uid] ?? [];
  const next = mine.includes(id)
    ? mine.filter((itemId) => itemId !== id)
    : [...mine, id];
  write(KEYS.savedMarket, { ...saved, [uid]: next });
  return next;
}

/* ---------------- Ishonch markazi: KYC, yordam va nizolar ---------------- */

export async function getVerification(): Promise<VerificationRecord | null> {
  ensureSeed();
  await delay(120);
  const uid = currentUserId();
  return (
    read<VerificationRecord[]>(KEYS.verifications, []).find(
      (record) => record.userId === uid
    ) ?? null
  );
}

export async function submitVerification(
  input: Omit<
    VerificationRecord,
    "userId" | "status" | "submittedAt" | "rejectionReason"
  >
): Promise<VerificationRecord> {
  await delay(450);
  const uid = currentUserId();
  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  const birthDate = new Date(input.birthDate);
  const validDocuments = input.documents.filter(
    (document) =>
      /^data:image\/(png|jpeg|webp);base64,/.test(document) &&
      document.length <= 1_050_000
  );
  if (
    !input.legalName.trim() ||
    !input.birthDate ||
    Number.isNaN(birthDate.getTime()) ||
    birthDate > adultCutoff ||
    validDocuments.length < 2
  ) {
    throw new Error("INVALID_INPUT");
  }
  const records = read<VerificationRecord[]>(KEYS.verifications, []);
  const next: VerificationRecord = {
    ...input,
    legalName: text(input.legalName, LIMITS.name),
    documents: validDocuments.slice(0, 3),
    userId: uid,
    status: "korib_chiqilmoqda",
    submittedAt: new Date().toISOString(),
  };
  const index = records.findIndex((record) => record.userId === uid);
  if (index >= 0) records[index] = next;
  else records.push(next);
  write(KEYS.verifications, records);
  return next;
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  ensureSeed();
  await delay(120);
  const uid = currentUserId();
  return read<SupportTicket[]>(KEYS.supportTickets, [])
    .filter((ticket) => ticket.userId === uid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createSupportTicket(
  input: Pick<SupportTicket, "topic" | "subject" | "message">
): Promise<SupportTicket> {
  await delay(350);
  const userId = currentUserId();
  const ticket: SupportTicket = {
    id: uid("ticket"),
    userId,
    topic: input.topic,
    subject: text(input.subject, 160),
    message: text(input.message, LIMITS.message),
    status: "ochiq",
    createdAt: new Date().toISOString(),
  };
  if (!ticket.subject || !ticket.message) throw new Error("INVALID_INPUT");
  const tickets = read<SupportTicket[]>(KEYS.supportTickets, []);
  write(KEYS.supportTickets, [...tickets, ticket]);
  return ticket;
}

export async function getDisputeByContract(
  contractId: string
): Promise<Dispute | null> {
  ensureSeed();
  await delay(120);
  if (!myContractIds().has(contractId)) return null;
  return (
    read<Dispute[]>(KEYS.disputes, []).find(
      (dispute) => dispute.contractId === contractId
    ) ?? null
  );
}

export async function openDispute(
  contractId: string,
  input: Pick<Dispute, "reason" | "description" | "evidence">
): Promise<Dispute> {
  await delay(450);
  const userId = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const index = contracts.findIndex(
    (contract) =>
      contract.id === contractId &&
      (contract.buyerId === userId || contract.sellerId === userId) &&
      contract.status === "faol"
  );
  if (index < 0) throw new Error("NOT_ALLOWED");
  assertTransition(contractMachine, contracts[index].status, "nizo", userId === contracts[index].buyerId ? "buyer" : "seller");
  const disputes = read<Dispute[]>(KEYS.disputes, []);
  if (disputes.some((dispute) => dispute.contractId === contractId)) {
    throw new Error("ALREADY_EXISTS");
  }
  const dispute: Dispute = {
    id: uid("dispute"),
    contractId,
    openedBy: userId,
    reason: input.reason,
    description: text(input.description, LIMITS.message),
    evidence: input.evidence.slice(0, 5),
    status: "ochiq",
    createdAt: new Date().toISOString(),
  };
  if (!dispute.description) throw new Error("INVALID_INPUT");
  contracts[index] = { ...contracts[index], status: "nizo" };
  write(KEYS.contracts, contracts);
  write(KEYS.disputes, [...disputes, dispute]);
  const otherId =
    contracts[index].buyerId === userId
      ? contracts[index].sellerId
      : contracts[index].buyerId;
  pushNotification(
    otherId,
    "bosqich",
    "ntf.disputeOpened",
    `${contracts[index].buyerId === otherId ? "/xaridor" : "/mutaxassis"}/shartnomalar/${contractId}`,
    { title: contracts[index].title }
  );
  return dispute;
}

export async function getAccountPreferences(): Promise<AccountPreferences> {
  ensureSeed();
  await delay(100);
  const userId = currentUserId();
  const all = read<Record<string, AccountPreferences>>(KEYS.preferences, {});
  return (
    all[userId] ?? {
      messages: true,
      contracts: true,
      payments: true,
      marketing: false,
    }
  );
}

export async function saveAccountPreferences(
  preferences: AccountPreferences
): Promise<void> {
  await delay(180);
  const userId = currentUserId();
  const all = read<Record<string, AccountPreferences>>(KEYS.preferences, {});
  write(KEYS.preferences, { ...all, [userId]: preferences });
}

export async function exportCurrentUserData(): Promise<Record<string, unknown>> {
  ensureSeed();
  await delay(250);
  const userId = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []).filter(
    (item) => item.buyerId === userId || item.sellerId === userId
  );
  const contractIds = new Set(contracts.map((item) => item.id));
  return {
    exportedAt: new Date().toISOString(),
    user: read<User[]>(KEYS.users, []).find((item) => item.id === userId),
    profile: read<Record<string, SellerProfile>>(KEYS.profiles, {})[userId],
    services: read<Service[]>(KEYS.services, []).filter(
      (item) => item.sellerId === userId
    ),
    jobs: read<Job[]>(KEYS.jobs, []).filter((item) => item.buyerId === userId),
    proposals: read<Proposal[]>(KEYS.proposals, []).filter(
      (item) => item.sellerId === userId
    ),
    offers: read<Offer[]>(KEYS.offers, []).filter(
      (item) => item.buyerId === userId || item.sellerId === userId
    ),
    contracts,
    milestones: read<Milestone[]>(KEYS.milestones, []).filter((item) =>
      contractIds.has(item.contractId)
    ),
    messages: read<Message[]>(KEYS.messages, []).filter((item) =>
      contractIds.has(item.contractId)
    ),
    reviews: read<Review[]>(KEYS.reviews, []).filter(
      (item) => item.sellerId === userId || contractIds.has(item.contractId)
    ),
    verification: await getVerification(),
    supportTickets: await getSupportTickets(),
    preferences: await getAccountPreferences(),
  };
}

export async function deleteCurrentAccount(): Promise<void> {
  await delay(350);
  const userId = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  if (
    contracts.some(
      (item) =>
        (item.buyerId === userId || item.sellerId === userId) &&
        (item.status === "faol" ||
          item.status === "imzolangan" ||
          item.status === "nizo")
    )
  ) {
    throw new Error("ACTIVE_CONTRACTS");
  }
  write(
    KEYS.users,
    read<User[]>(KEYS.users, []).filter((item) => item.id !== userId)
  );
  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  delete profiles[userId];
  write(KEYS.profiles, profiles);
  write(
    KEYS.services,
    read<Service[]>(KEYS.services, []).filter((item) => item.sellerId !== userId)
  );
  write(
    KEYS.jobs,
    read<Job[]>(KEYS.jobs, []).filter((item) => item.buyerId !== userId)
  );
  write(
    KEYS.cards,
    read<PaymentCard[]>(KEYS.cards, []).filter((item) => item.userId !== userId)
  );
  write(
    KEYS.notifications,
    read<AppNotification[]>(KEYS.notifications, []).filter(
      (item) => item.userId !== userId
    )
  );
  write(
    KEYS.proposals,
    read<Proposal[]>(KEYS.proposals, []).filter((item) => item.sellerId !== userId)
  );
  write(
    KEYS.offers,
    read<Offer[]>(KEYS.offers, []).filter(
      (item) => item.buyerId !== userId && item.sellerId !== userId
    )
  );
  write(
    KEYS.verifications,
    read<VerificationRecord[]>(KEYS.verifications, []).filter(
      (item) => item.userId !== userId
    )
  );
  write(
    KEYS.supportTickets,
    read<SupportTicket[]>(KEYS.supportTickets, []).filter(
      (item) => item.userId !== userId
    )
  );
  write(
    KEYS.disputes,
    read<Dispute[]>(KEYS.disputes, []).filter(
      (item) => item.openedBy !== userId
    )
  );
  /* Yakunlangan moliyaviy yozuvlar boshqa taraf va audit uchun saqlanadi,
     lekin foydalanuvchi nomi anonimlashtiriladi. */
  write(
    KEYS.contracts,
    contracts.map((item) => ({
      ...item,
      buyerName: item.buyerId === userId ? "O'chirilgan foydalanuvchi" : item.buyerName,
      sellerName:
        item.sellerId === userId ? "O'chirilgan foydalanuvchi" : item.sellerName,
    }))
  );
  const preferences = read<Record<string, AccountPreferences>>(
    KEYS.preferences,
    {}
  );
  delete preferences[userId];
  write(KEYS.preferences, preferences);
  const balances = read<Record<string, number>>(KEYS.balances, {});
  delete balances[userId];
  write(KEYS.balances, balances);
  const withdrawn = read<Record<string, number>>(KEYS.withdrawn, {});
  delete withdrawn[userId];
  write(KEYS.withdrawn, withdrawn);
  const savedJobs = read<Record<string, string[]> | string[]>(KEYS.savedJobs, {});
  if (!Array.isArray(savedJobs)) {
    delete savedJobs[userId];
    write(KEYS.savedJobs, savedJobs);
  }
  const savedMarket = read<Record<string, string[]>>(KEYS.savedMarket, {});
  delete savedMarket[userId];
  write(KEYS.savedMarket, savedMarket);
  window.localStorage.removeItem(KEYS.session);
}

/* ---------------- Taklifni qaytarib olish ---------------- */

export async function withdrawProposal(id: string): Promise<Proposal> {
  await delay(400);
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  /* Egalik tekshiruvi — faqat o'z taklifini qaytarib olish mumkin */
  const idx = proposals.findIndex(
    (p) => p.id === id && p.sellerId === currentUserId()
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  assertTransition(
    proposalMachine,
    proposals[idx].status,
    "qaytarib_olingan",
    "seller"
  );
  const job = read<Job[]>(KEYS.jobs, []).find((item) => item.id === proposals[idx].jobId);
  if (!job || job.status !== "ochiq") throw new Error("BAD_STATE");
  proposals[idx] = { ...proposals[idx], status: "qaytarib_olingan" };
  write(KEYS.proposals, proposals);

  /* E'londagi takliflar soni ham kamayadi */
  const jobs = read<Job[]>(KEYS.jobs, []);
  const jIdx = jobs.findIndex((j) => j.id === proposals[idx].jobId);
  if (jIdx >= 0) {
    jobs[jIdx] = {
      ...jobs[jIdx],
      proposalsCount: Math.max(0, jobs[jIdx].proposalsCount - 1),
    };
    write(KEYS.jobs, jobs);
  }
  return proposals[idx];
}

export async function getProposal(id: string): Promise<Proposal | null> {
  ensureSeed();
  await delay(200);
  const uid2 = currentUserId();
  const proposal = read<Proposal[]>(KEYS.proposals, []).find((p) => p.id === id);
  if (!proposal) return null;
  /* Egalik tekshiruvi: taklif egasi (mutaxassis) yoki e'lon egasi (xaridor) */
  if (proposal.sellerId === uid2) return proposal;
  const job = read<Job[]>(KEYS.jobs, []).find((j) => j.id === proposal.jobId);
  return job && job.buyerId === uid2 ? proposal : null;
}

/* ---------------- Pul yechish (mock) ---------------- */

/** Mutaxassisning yechib olingan jami summasi (daromaddan ayiriladi) */
export async function getWithdrawnTotal(): Promise<number> {
  ensureSeed();
  await delay(100);
  return read<Record<string, number>>(KEYS.withdrawn, {})[currentUserId()] ?? 0;
}

/** Mutaxassis daromadini bog'langan kartaga yechish: qabul qilingan bosqichlar
   summasidan hali yechilmagan qismini o'sha kartaga o'tkazadi (mock). */
export async function withdrawFunds(cardId: string): Promise<void> {
  await delay(700);
  const uid2 = currentUserId();
  assertOwnCard(cardId, uid2);
  const myContracts = new Set(
    read<Contract[]>(KEYS.contracts, [])
      .filter((c) => c.sellerId === uid2)
      .map((c) => c.id)
  );
  const earned = read<Milestone[]>(KEYS.milestones, [])
    .filter((m) => myContracts.has(m.contractId) && m.status === "qabul_qilindi")
    .reduce((sum, m) => sum + m.amount, 0);
  const withdrawn = read<Record<string, number>>(KEYS.withdrawn, {});
  if ((withdrawn[uid2] ?? 0) >= earned) throw new Error("NO_BALANCE");
  withdrawn[uid2] = earned;
  write(KEYS.withdrawn, withdrawn);
}

/* ================= XARIDOR (yollovchi) tomoni ================= */

/** Katalog: to'ldirilgan profilli mutaxassislar (chala ro'yxatdan
   o'tganlar katalogga chiqmaydi) */
export async function getSpecialists(): Promise<Specialist[]> {
  ensureSeed();
  await delay();
  const users = read<User[]>(KEYS.users, []);
  const profiles = read<Record<string, SellerProfile>>(KEYS.profiles, {});
  return users
    .filter(
      (u) =>
        u.role === "mutaxassis" &&
        profiles[u.id] &&
        profiles[u.id].bio.trim().length > 0
    )
    .map((u) => ({ user: u, profile: profiles[u.id] }));
}

export async function getSpecialist(userId: string): Promise<Specialist | null> {
  ensureSeed();
  await delay(200);
  const user = read<User[]>(KEYS.users, []).find((u) => u.id === userId);
  const profile = read<Record<string, SellerProfile>>(KEYS.profiles, {})[userId];
  return user && profile ? { user, profile } : null;
}

/** Katalog: barcha faol xizmatlar (egasidan qat'i nazar) */
export async function getPublicServices(): Promise<Service[]> {
  ensureSeed();
  await delay();
  return read<Service[]>(KEYS.services, []).filter((s) => s.status === "active");
}

/** Mutaxassisning ochiq profili uchun sharhlar */
export async function getReviewsForSeller(sellerId: string): Promise<Review[]> {
  ensureSeed();
  await delay(150);
  return read<Review[]>(KEYS.reviews, [])
    .filter((r) => r.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------------- Xaridor: ish e'lonlari ---------------- */

export async function getBuyerJobs(): Promise<Job[]> {
  ensureSeed();
  await delay();
  const uid = currentUserId();
  return read<Job[]>(KEYS.jobs, [])
    .filter((j) => j.buyerId === uid)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export async function createJob(data: {
  title: string;
  description: string;
  category: Job["category"];
  budgetMin: number;
  budgetMax: number;
  skillsRequired: string[];
  screeningQuestions: string[];
}): Promise<Job> {
  await delay(500);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  if (session.role !== "xaridor") throw new Error("FORBIDDEN");
  const users = read<User[]>(KEYS.users, []);
  const user = users.find((u) => u.id === session.userId);
  const jobs = read<Job[]>(KEYS.jobs, []);
  /* Xaridor reytingi: avvalgi e'lonidan olinadi, bo'lmasa 0 (yangi xaridor) */
  const prevRating =
    jobs.find((j) => j.buyerId === session.userId)?.buyerRating ?? 0;
  const budgetMin = amount(data.budgetMin);
  const budgetMax = amount(data.budgetMax, { min: budgetMin });
  const job: Job = {
    title: text(data.title, LIMITS.title),
    description: text(data.description, LIMITS.description),
    category: data.category,
    budgetMin,
    budgetMax,
    skillsRequired: textList(data.skillsRequired, 20, LIMITS.skill),
    screeningQuestions: textList(data.screeningQuestions, 3, LIMITS.question),
    id: uid("j"),
    buyerId: session.userId,
    buyerName: user?.fullName ?? "",
    buyerRating: prevRating,
    currency: "UZS",
    proposalsCount: 0,
    postedAt: new Date().toISOString(),
    status: "ochiq",
  };
  jobs.push(job);
  write(KEYS.jobs, jobs);
  return job;
}

export async function closeJob(id: string): Promise<Job> {
  await delay(300);
  const uid2 = currentUserId();
  const jobs = read<Job[]>(KEYS.jobs, []);
  const idx = jobs.findIndex((j) => j.id === id && j.buyerId === uid2);
  if (idx < 0) throw new Error("NOT_FOUND");
  assertTransition(jobMachine, jobs[idx].status, "yopilgan", "buyer");
  jobs[idx] = { ...jobs[idx], status: "yopilgan" };
  write(KEYS.jobs, jobs);

  /* Faol takliflar rad etiladi — mutaxassislar kutib qolmasligi uchun */
  const ACTIVE = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  let changed = false;
  for (let i = 0; i < proposals.length; i++) {
    if (proposals[i].jobId === id && ACTIVE.includes(proposals[i].status)) {
      proposals[i] = { ...proposals[i], status: "rad_etildi" };
      changed = true;
      pushNotification(
        proposals[i].sellerId,
        "taklif",
        "ntf.proposalRejected",
        `/mutaxassis/takliflarim/${proposals[i].id}`,
        { title: jobs[idx].title }
      );
    }
  }
  if (changed) write(KEYS.proposals, proposals);
  return jobs[idx];
}

/** E'longa kelgan takliflar (faqat e'lon egasi uchun) */
export async function getJobProposals(jobId: string): Promise<Proposal[]> {
  ensureSeed();
  await delay(200);
  const uid2 = currentUserId();
  const job = read<Job[]>(KEYS.jobs, []).find((j) => j.id === jobId);
  if (!job || job.buyerId !== uid2) return [];
  return read<Proposal[]>(KEYS.proposals, [])
    .filter((p) => p.jobId === jobId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Taklif holatini o'zgartirish: ko'rib chiqish / suhbat / rad etish */
export async function setProposalStatus(
  id: string,
  status: "korib_chiqilmoqda" | "suhbat" | "rad_etildi"
): Promise<Proposal> {
  await delay(300);
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  const proposal = proposals.find((item) => item.id === id);
  if (!proposal) throw new Error("NOT_FOUND");
  const job = read<Job[]>(KEYS.jobs, []).find(
    (item) => item.id === proposal.jobId && item.buyerId === currentUserId()
  );
  if (!job || job.status !== "ochiq") throw new Error("NOT_FOUND");
  const idx = proposals.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("NOT_FOUND");
  assertTransition(proposalMachine, proposals[idx].status, status, "buyer");
  proposals[idx] = { ...proposals[idx], status };
  write(KEYS.proposals, proposals);

  const notificationJob = read<Job[]>(KEYS.jobs, []).find(
    (j) => j.id === proposals[idx].jobId
  );
  if (notificationJob && (status === "suhbat" || status === "rad_etildi")) {
    pushNotification(
      proposals[idx].sellerId,
      "taklif",
      status === "suhbat" ? "ntf.proposalInterview" : "ntf.proposalRejected",
      `/mutaxassis/takliflarim/${proposals[idx].id}`,
      { title: notificationJob.title }
    );
  }
  return proposals[idx];
}

/** Yollash (Upwork modeli): bosqichlar belgilanadi (to'lovsiz — mablag'lash
   keyin workroom'da), e'lon yopiladi, qolgan faol takliflar rad etiladi. */
export async function hireProposal(
  proposalId: string,
  milestonesInput: {
    title: string;
    description: string;
    amount: number;
    dueDate: string;
  }[]
): Promise<Contract> {
  await delay(600);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  if (session.role !== "xaridor") throw new Error("FORBIDDEN");
  const proposals = read<Proposal[]>(KEYS.proposals, []);
  const pIdx = proposals.findIndex((p) => p.id === proposalId);
  if (pIdx < 0 || !milestonesInput.length) throw new Error("NOT_FOUND");
  const proposal = proposals[pIdx];

  const jobs = read<Job[]>(KEYS.jobs, []);
  const jIdx = jobs.findIndex((j) => j.id === proposal.jobId);
  if (jIdx < 0 || jobs[jIdx].buyerId !== session.userId)
    throw new Error("NOT_FOUND");
  const job = jobs[jIdx];
  if (job.status !== "ochiq") throw new Error("BAD_STATE");
  assertTransition(proposalMachine, proposal.status, "yollandi", "buyer");
  if (
    read<Contract[]>(KEYS.contracts, []).some(
      (contract) => contract.jobId === job.id && contract.sellerId === proposal.sellerId
    )
  ) {
    throw new Error("DUPLICATE");
  }

  const users = read<User[]>(KEYS.users, []);
  const buyerName = users.find((u) => u.id === session.userId)?.fullName ?? "";
  const sellerName =
    users.find((u) => u.id === proposal.sellerId)?.fullName ?? "";

  /* Bosqichlarni validatsiya qilamiz — summa/nom/muddat ishonchsiz kirish */
  if (milestonesInput.length > 20) throw new Error("TOO_MANY_MILESTONES");
  const cleanMilestones = milestonesInput.map((m) => ({
    title: text(m.title, LIMITS.title),
    description: text(m.description, LIMITS.description),
    amount: amount(m.amount),
    dueDate: m.dueDate,
  }));

  const contract: Contract = {
    id: uid("c"),
    sourceType: "taklif",
    jobId: job.id,
    buyerId: session.userId,
    buyerName,
    sellerId: proposal.sellerId,
    sellerName,
    title: job.title,
    totalAmount: cleanMilestones.reduce((sum, m) => sum + m.amount, 0),
    /* Imzolangan — xaridor escrow'ga to'lagach faollashadi (ish boshlanadi) */
    status: "imzolangan",
    createdAt: new Date().toISOString(),
  };
  const contracts = read<Contract[]>(KEYS.contracts, []);
  contracts.push(contract);
  write(KEYS.contracts, contracts);

  const milestones = read<Milestone[]>(KEYS.milestones, []);
  cleanMilestones.forEach((m) => {
    milestones.push({
      id: uid("ms"),
      contractId: contract.id,
      title: m.title,
      description: m.description,
      amount: m.amount,
      status: "kutilmoqda",
      dueDate: m.dueDate,
    });
  });
  write(KEYS.milestones, milestones);

  /* Taklif yollandi, qolgan faol takliflar rad etiladi */
  const ACTIVE = ["yuborilgan", "korib_chiqilmoqda", "suhbat"];
  for (let i = 0; i < proposals.length; i++) {
    if (proposals[i].id === proposalId) {
      proposals[i] = { ...proposals[i], status: "yollandi" };
    } else if (
      proposals[i].jobId === job.id &&
      ACTIVE.includes(proposals[i].status)
    ) {
      proposals[i] = { ...proposals[i], status: "rad_etildi" };
      pushNotification(
        proposals[i].sellerId,
        "taklif",
        "ntf.proposalRejected",
        `/mutaxassis/takliflarim/${proposals[i].id}`,
        { title: job.title }
      );
    }
  }
  write(KEYS.proposals, proposals);

  jobs[jIdx] = { ...job, status: "yopilgan" };
  write(KEYS.jobs, jobs);

  pushNotification(
    proposal.sellerId,
    "taklif",
    "ntf.hired",
    `/mutaxassis/shartnomalar/${contract.id}`,
    { title: job.title }
  );
  return contract;
}

/* ---------------- To'g'ridan-to'g'ri takliflar (to'lovsiz) ---------------- */

/** Xaridor mutaxassisga taklif yuboradi — to'lov yo'q. Boshlang'ich xabar
   taklif chat'iga ham yoziladi; mutaxassis qabul qilsa shartnoma ochiladi. */
export async function createOffer(data: {
  sellerId: string;
  serviceId?: string;
  title: string;
  message: string;
  budget: number;
}): Promise<Offer> {
  await delay(500);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  if (session.role !== "xaridor" || session.userId === data.sellerId) {
    throw new Error("FORBIDDEN");
  }
  const offers = read<Offer[]>(KEYS.offers, []);
  /* Bitta mutaxassisga bitta kutilayotgan taklif */
  const hasPending = offers.some(
    (o) =>
      o.buyerId === session.userId &&
      o.sellerId === data.sellerId &&
      o.status === "yuborilgan"
  );
  if (hasPending) throw new Error("DUPLICATE_OFFER");

  const users = read<User[]>(KEYS.users, []);
  const buyerName = users.find((u) => u.id === session.userId)?.fullName ?? "";
  const seller = users.find((u) => u.id === data.sellerId && u.role === "mutaxassis");
  if (!seller) throw new Error("NOT_FOUND");
  const sellerName = seller.fullName;

  const offer: Offer = {
    id: uid("o"),
    buyerId: session.userId,
    buyerName,
    sellerId: data.sellerId,
    sellerName,
    serviceId: data.serviceId,
    title: text(data.title, LIMITS.title),
    message: text(data.message, LIMITS.message),
    budget: amount(data.budget),
    status: "yuborilgan",
    createdAt: new Date().toISOString(),
  };
  offers.push(offer);
  write(KEYS.offers, offers);

  /* Boshlang'ich xabar taklif chat'ida */
  const messages = read<Message[]>(KEYS.messages, []);
  messages.push({
    id: uid("m"),
    contractId: offer.id,
    senderId: session.userId,
    text: offer.message,
    createdAt: offer.createdAt,
  });
  write(KEYS.messages, messages);

  pushNotification(
    data.sellerId,
    "taklif",
    "ntf.newOffer",
    `/mutaxassis/takliflarim/kelgan/${offer.id}`,
    { title: offer.title }
  );
  return offer;
}

/** Xaridor yuborgan takliflar */
export async function getSentOffers(): Promise<Offer[]> {
  ensureSeed();
  await delay();
  const uid2 = currentUserId();
  return read<Offer[]>(KEYS.offers, [])
    .filter((o) => o.buyerId === uid2)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Mutaxassisga kelgan takliflar */
export async function getIncomingOffers(): Promise<Offer[]> {
  ensureSeed();
  await delay();
  const uid2 = currentUserId();
  return read<Offer[]>(KEYS.offers, [])
    .filter((o) => o.sellerId === uid2)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOffer(id: string): Promise<Offer | null> {
  ensureSeed();
  await delay(200);
  const uid2 = currentUserId();
  const offer = read<Offer[]>(KEYS.offers, []).find((o) => o.id === id);
  /* Faqat taklif tomonlari ochishi mumkin */
  return offer && (offer.buyerId === uid2 || offer.sellerId === uid2)
    ? offer
    : null;
}

/** Mutaxassis taklifni qabul qiladi: shartnoma ochiladi (bosqich
   mablag'lanmagan — xaridor workroom'da mablag'laydi), taklif chati
   shartnoma chati'ga ko'chadi. */
export async function acceptOffer(id: string): Promise<Contract> {
  await delay(600);
  const uid2 = currentUserId();
  const offers = read<Offer[]>(KEYS.offers, []);
  const idx = offers.findIndex(
    (o) => o.id === id && o.sellerId === uid2 && o.status === "yuborilgan"
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const offer = offers[idx];
  assertTransition(offerMachine, offer.status, "qabul_qilindi", "seller");

  const service = offer.serviceId
    ? read<Service[]>(KEYS.services, []).find((s) => s.id === offer.serviceId)
    : undefined;

  const contract: Contract = {
    id: uid("c"),
    sourceType: offer.serviceId ? "xizmat" : "taklifnoma",
    serviceId: offer.serviceId,
    buyerId: offer.buyerId,
    buyerName: offer.buyerName,
    sellerId: offer.sellerId,
    sellerName: offer.sellerName,
    title: offer.title,
    totalAmount: offer.budget,
    /* Imzolangan — xaridor escrow'ga to'lagach faollashadi */
    status: "imzolangan",
    createdAt: new Date().toISOString(),
  };
  const contracts = read<Contract[]>(KEYS.contracts, []);
  contracts.push(contract);
  write(KEYS.contracts, contracts);

  const due = new Date();
  due.setDate(due.getDate() + (service?.deliveryDays ?? 14));
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  milestones.push({
    id: uid("ms"),
    contractId: contract.id,
    title: offer.title,
    description: offer.message,
    amount: offer.budget,
    status: "kutilmoqda",
    dueDate: due.toISOString(),
  });
  write(KEYS.milestones, milestones);

  /* Taklif chati shartnoma chati bo'lib davom etadi */
  const messages = read<Message[]>(KEYS.messages, []);
  write(
    KEYS.messages,
    messages.map((m) =>
      m.contractId === offer.id ? { ...m, contractId: contract.id } : m
    )
  );

  offers[idx] = { ...offer, status: "qabul_qilindi", contractId: contract.id };
  write(KEYS.offers, offers);

  pushNotification(
    offer.buyerId,
    "taklif",
    "ntf.offerAccepted",
    `/xaridor/shartnomalar/${contract.id}`,
    { title: offer.title }
  );
  return contract;
}

/** Xaridor kutilayotgan taklifini bekor qiladi (qaytarib oladi) */
export async function withdrawOffer(id: string): Promise<Offer> {
  await delay(400);
  const uid2 = currentUserId();
  const offers = read<Offer[]>(KEYS.offers, []);
  const idx = offers.findIndex(
    (o) => o.id === id && o.buyerId === uid2 && o.status === "yuborilgan"
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  assertTransition(offerMachine, offers[idx].status, "bekor_qilingan", "buyer");
  offers[idx] = { ...offers[idx], status: "bekor_qilingan" };
  write(KEYS.offers, offers);
  pushNotification(
    offers[idx].sellerId,
    "taklif",
    "ntf.offerWithdrawn",
    `/mutaxassis/takliflarim/kelgan/${id}`,
    { title: offers[idx].title }
  );
  return offers[idx];
}

/** Mutaxassis taklifni rad etadi */
export async function declineOffer(id: string): Promise<Offer> {
  await delay(400);
  const uid2 = currentUserId();
  const offers = read<Offer[]>(KEYS.offers, []);
  const idx = offers.findIndex(
    (o) => o.id === id && o.sellerId === uid2 && o.status === "yuborilgan"
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  assertTransition(offerMachine, offers[idx].status, "rad_etildi", "seller");
  offers[idx] = { ...offers[idx], status: "rad_etildi" };
  write(KEYS.offers, offers);
  pushNotification(
    offers[idx].buyerId,
    "taklif",
    "ntf.offerDeclined",
    `/xaridor/takliflarim/${offers[idx].id}`,
    { title: offers[idx].title }
  );
  return offers[idx];
}

/* ---------------- Xaridor: bosqich boshqaruvi ---------------- */

function findOwnMilestone(
  id: string,
  milestones: Milestone[],
  contracts: Contract[]
): { idx: number; contract: Contract } {
  const uid2 = currentUserId();
  const idx = milestones.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("NOT_FOUND");
  const contract = contracts.find(
    (c) => c.id === milestones[idx].contractId && c.buyerId === uid2
  );
  if (!contract) throw new Error("NOT_FOUND");
  return { idx, contract };
}

/** Shartnomani escrow'ga to'liq mablag'lash (Fiverr/Kwork modeli):
   xaridor BUTUN summani birdan Bobo&Doda hisobiga to'laydi → shartnoma
   faollashadi, barcha bosqichlar 'mablaglangan' bo'ladi, ish boshlanishi
   mumkin. Pul har bosqich qabul qilinganda mutaxassisga o'tadi. */
export async function fundContract(id: string): Promise<Contract> {
  await delay(700);
  const system = read<{ paymentsPaused?: boolean }>("sb2_system_settings", {});
  if (system.paymentsPaused) throw new Error("PAYMENTS_PAUSED");
  const uid2 = currentUserId();
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const idx = contracts.findIndex(
    (c) => c.id === id && c.buyerId === uid2 && c.status === "imzolangan"
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const contract = contracts[idx];
  assertTransition(contractMachine, contract.status, "faol", "buyer");

  /* Barcha kutilayotgan bosqichlar bir to'lovda mablag'lanadi */
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  if (!milestones.some((milestone) => milestone.contractId === id && milestone.status === "kutilmoqda")) {
    throw new Error("BAD_STATE");
  }
  const updated = milestones.map((m) =>
    m.contractId === id && m.status === "kutilmoqda"
      ? { ...m, status: "mablaglangan" as const }
      : m
  );
  write(KEYS.milestones, updated);

  contracts[idx] = { ...contract, status: "faol" };
  write(KEYS.contracts, contracts);

  pushNotification(
    contract.sellerId,
    "bosqich",
    "ntf.contractFunded",
    `/mutaxassis/shartnomalar/${id}`,
    { title: contract.title }
  );
  return contracts[idx];
}

/* ---------------- Xaridor hisobi (balans / qaytarilgan mablag') ---------------- */

function readBalances(): Record<string, number> {
  return read<Record<string, number>>(KEYS.balances, {});
}

function creditBalance(userId: string, sum: number): void {
  if (sum <= 0) return;
  const balances = readBalances();
  balances[userId] = (balances[userId] ?? 0) + sum;
  write(KEYS.balances, balances);
}

/** Joriy xaridorning Bobo&Doda hisobidagi (qaytarilgan) mablag'i */
export async function getBalance(): Promise<number> {
  ensureSeed();
  await delay(150);
  return readBalances()[currentUserId()] ?? 0;
}

/** Balansni bog'langan kartaga yechish (mock). cardId — o'z kartasi bo'lishi shart. */
export async function withdrawBalance(cardId: string): Promise<number> {
  await delay(700);
  const uid2 = currentUserId();
  assertOwnCard(cardId, uid2);
  const balances = readBalances();
  if (!balances[uid2] || balances[uid2] <= 0) throw new Error("NO_BALANCE");
  balances[uid2] = 0;
  write(KEYS.balances, balances);
  return 0;
}

/* ---------------- Bank kartalari (Uzcard / Humo) ---------------- */

function assertOwnCard(cardId: string, userId: string): void {
  const card = read<PaymentCard[]>(KEYS.cards, []).find(
    (c) => c.id === cardId && c.userId === userId
  );
  if (!card) throw new Error("CARD_NOT_FOUND");
}

/** Joriy foydalanuvchi bog'lagan kartalar */
export async function getCards(): Promise<PaymentCard[]> {
  ensureSeed();
  await delay(150);
  const uid2 = currentUserId();
  return read<PaymentCard[]>(KEYS.cards, [])
    .filter((c) => c.userId === uid2)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Yangi karta bog'lash — raqam/muddat tekshiriladi, faqat oxirgi 4 raqam saqlanadi */
export async function addCard(data: {
  number: string;
  holderName: string;
  expiry: string;
}): Promise<PaymentCard> {
  await delay(500);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  const { type, last4 } = cardNumber(data.number); // xato → INVALID_CARD
  const expiry = cardExpiry(data.expiry); // xato → INVALID_EXPIRY
  const holderName = text(data.holderName, LIMITS.name);
  if (!holderName) throw new Error("INVALID_HOLDER");

  const cards = read<PaymentCard[]>(KEYS.cards, []);
  /* Bir foydalanuvchida bir karta ikki marta bog'lanmaydi */
  if (
    cards.some(
      (c) => c.userId === session.userId && c.last4 === last4 && c.type === type
    )
  ) {
    throw new Error("CARD_EXISTS");
  }
  if (cards.filter((c) => c.userId === session.userId).length >= 5) {
    throw new Error("CARD_LIMIT");
  }
  const card: PaymentCard = {
    id: uid("card"),
    userId: session.userId,
    type,
    last4,
    holderName,
    expiry,
    createdAt: new Date().toISOString(),
  };
  cards.push(card);
  write(KEYS.cards, cards);
  return card;
}

export async function removeCard(id: string): Promise<void> {
  await delay(300);
  const uid2 = currentUserId();
  const cards = read<PaymentCard[]>(KEYS.cards, []);
  write(
    KEYS.cards,
    cards.filter((c) => !(c.id === id && c.userId === uid2))
  );
}

/** Ishni qabul qilish: topshirildi → qabul qilindi; barcha bosqichlar
   qabul qilinsa shartnoma yakunlanadi. */
export async function acceptMilestone(id: string): Promise<Milestone> {
  await delay(500);
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const { idx, contract } = findOwnMilestone(id, milestones, contracts);
  if (contract.status !== "faol") throw new Error("BAD_STATE");
  assertTransition(milestoneMachine, milestones[idx].status, "qabul_qilindi", "buyer");
  milestones[idx] = {
    ...milestones[idx],
    status: "qabul_qilindi",
    approvedAt: new Date().toISOString(),
  };
  write(KEYS.milestones, milestones);

  const own = milestones.filter((m) => m.contractId === contract.id);
  if (own.every((m) => m.status === "qabul_qilindi")) {
    const cIdx = contracts.findIndex((c) => c.id === contract.id);
    contracts[cIdx] = { ...contract, status: "yakunlangan" };
    write(KEYS.contracts, contracts);
  }

  pushNotification(
    contract.sellerId,
    "tolov",
    "ntf.milestoneAccepted",
    `/mutaxassis/shartnomalar/${contract.id}`,
    { title: milestones[idx].title }
  );
  return milestones[idx];
}

/** O'zgartirish so'rash: topshirildi → o'zgartirish so'raldi (izoh majburiy) */
export async function requestRevision(
  id: string,
  comment: string
): Promise<Milestone> {
  await delay(500);
  if (!comment.trim()) throw new Error("COMMENT_REQUIRED");
  const milestones = read<Milestone[]>(KEYS.milestones, []);
  const contracts = read<Contract[]>(KEYS.contracts, []);
  const { idx, contract } = findOwnMilestone(id, milestones, contracts);
  if (contract.status !== "faol") throw new Error("BAD_STATE");
  assertTransition(
    milestoneMachine,
    milestones[idx].status,
    "ozgartirish_soraldi",
    "buyer"
  );
  milestones[idx] = {
    ...milestones[idx],
    status: "ozgartirish_soraldi",
    revisionComment: comment.trim(),
  };
  write(KEYS.milestones, milestones);
  pushNotification(
    contract.sellerId,
    "bosqich",
    "ntf.revisionRequested",
    `/mutaxassis/shartnomalar/${contract.id}`,
    { title: milestones[idx].title }
  );
  return milestones[idx];
}

/* ---------------- Xaridor: sharh qoldirish ---------------- */

export async function createReview(
  contractId: string,
  rating: number,
  comment: string
): Promise<Review> {
  await delay(500);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  const contract = read<Contract[]>(KEYS.contracts, []).find(
    (c) => c.id === contractId && c.buyerId === session.userId
  );
  if (!contract) throw new Error("NOT_FOUND");
  if (contract.status !== "yakunlangan") throw new Error("BAD_STATE");
  const reviews = read<Review[]>(KEYS.reviews, []);
  if (reviews.some((r) => r.contractId === contractId))
    throw new Error("ALREADY_REVIEWED");
  /* Reyting butun son, 1–5 oralig'ida bo'lishi shart */
  const safeRating = amount(rating, { min: 1, max: 5 });
  const review: Review = {
    id: uid("r"),
    contractId,
    sellerId: contract.sellerId,
    buyerName: contract.buyerName,
    rating: safeRating,
    comment: text(comment, LIMITS.comment),
    createdAt: new Date().toISOString(),
  };
  reviews.push(review);
  write(KEYS.reviews, reviews);
  return review;
}

/* ---------------- Xaridor: sozlamalar ---------------- */

export async function updateUserName(fullName: string): Promise<void> {
  await delay(300);
  const clean = text(fullName, LIMITS.name);
  if (!clean) throw new Error("INVALID_NAME");
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  const users = read<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], fullName: clean };
    write(KEYS.users, users);
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await delay(350);
  const session = getSession();
  if (!session) throw new Error("NO_SESSION");
  const users = read<User[]>(KEYS.users, []);
  const index = users.findIndex((user) => user.id === session.userId);
  if (index < 0 || users[index].password !== currentPassword) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }
  const cleaned = text(newPassword, LIMITS.password);
  if (cleaned.length < 8 || !/[A-Za-z]/.test(cleaned) || !/\d/.test(cleaned)) {
    throw new Error("WEAK_PASSWORD");
  }
  users[index] = { ...users[index], password: cleaned };
  write(KEYS.users, users);
}

export { SELLER_ID, BUYER_ID };
