import type * as Model from "@/lib/types";
import type { AdminAccount, AdminPermission, AdminSession, AuditEvent } from "@/lib/admin-types";
import type { PaymentStatus } from "./state-machines";

export interface ApiPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface ApiListQuery {
  cursor?: string;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface PaymentDTO {
  id: string;
  contractId: string;
  provider: "click" | "payme" | "card";
  providerReference?: string;
  idempotencyKey: string;
  amount: number;
  currency: "UZS";
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthService {
  getSession(): Model.Session | null;
  login(input: { phone: string; password: string }): Promise<Model.Session>;
  register(input: { phone: string; password: string; fullName: string }): Promise<Model.Session>;
  verifyTelegram(code: string): Promise<Model.Session>;
  chooseRole(role: Model.UserRole): Promise<Model.Session>;
  resetPassword(input: { phone: string; code: string; newPassword: string }): Promise<void>;
  logout(): void;
}

export interface UsersService {
  getCurrent(): Promise<Model.User | null>;
  getSellerProfile(): Promise<Model.SellerProfile>;
  updateName(fullName: string): Promise<void>;
  completeSellerProfile(input: {
    fullName: string;
    bio: string;
    skills: string[];
    categories: string[];
    location: string;
  }): Promise<void>;
  updateSellerProfile(input: {
    fullName: string;
    bio: string;
    headline?: string;
    skills?: string[];
    location?: string;
    languages?: Model.ProfileLanguage[];
    portfolio?: Model.PortfolioItem[];
  }): Promise<void>;
  setAvailability(available: boolean): Promise<void>;
  getPreferences(): Promise<Model.AccountPreferences>;
  savePreferences(preferences: Model.AccountPreferences): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  exportData(): Promise<Record<string, unknown>>;
  deleteAccount(): Promise<void>;
}

/** Ochiq katalog: mutaxassis profillari va ular haqidagi sharhlar */
export interface CatalogService {
  listSpecialists(): Promise<Model.Specialist[]>;
  getSpecialist(userId: string): Promise<Model.Specialist | null>;
  listSellerReviews(sellerId: string): Promise<Model.Review[]>;
}

/** Saqlangan (bookmark) elementlar — e'lonlar va bozor kartalari */
export interface SavedService {
  listJobIds(): Promise<string[]>;
  toggleJob(jobId: string): Promise<string[]>;
  listMarketIds(): Promise<string[]>;
  toggleMarketItem(id: string): Promise<string[]>;
}

export interface ServicesService {
  listMine(): Promise<Model.Service[]>;
  listPublic(): Promise<Model.Service[]>;
  get(id: string): Promise<Model.Service | null>;
  create(input: Omit<Model.Service, "id" | "sellerId" | "currency" | "createdAt">): Promise<Model.Service>;
  update(id: string, input: Partial<Omit<Model.Service, "id" | "sellerId" | "createdAt">>): Promise<Model.Service>;
  remove(id: string): Promise<void>;
}

export interface JobsService {
  list(): Promise<Model.Job[]>;
  get(id: string): Promise<Model.Job | null>;
  listMine(): Promise<Model.Job[]>;
  create(input: {
    title: string;
    description: string;
    category: Model.Job["category"];
    budgetMin: number;
    budgetMax: number;
    skillsRequired: string[];
    screeningQuestions: string[];
  }): Promise<Model.Job>;
  close(id: string): Promise<Model.Job>;
}

export interface ProposalsService {
  listMine(): Promise<Model.Proposal[]>;
  get(id: string): Promise<Model.Proposal | null>;
  listForJob(jobId: string): Promise<Model.Proposal[]>;
  create(input: {
    jobId: string;
    bidAmount: number;
    coverLetter: string;
    screeningAnswers: { question: string; answer: string }[];
    attachedImages: string[];
  }): Promise<Model.Proposal>;
  setStatus(
    id: string,
    status: "korib_chiqilmoqda" | "suhbat" | "rad_etildi"
  ): Promise<Model.Proposal>;
  hire(
    proposalId: string,
    milestones: {
      title: string;
      description: string;
      amount: number;
      dueDate: string;
    }[]
  ): Promise<Model.Contract>;
  withdraw(id: string): Promise<Model.Proposal>;
}

export interface OffersService {
  get(id: string): Promise<Model.Offer | null>;
  create(input: {
    sellerId: string;
    serviceId?: string;
    title: string;
    message: string;
    budget: number;
  }): Promise<Model.Offer>;
  listSent(): Promise<Model.Offer[]>;
  listIncoming(): Promise<Model.Offer[]>;
  accept(id: string): Promise<Model.Contract>;
  withdraw(id: string): Promise<Model.Offer>;
  decline(id: string): Promise<Model.Offer>;
}

export interface ContractsService {
  list(): Promise<Model.Contract[]>;
  get(id: string): Promise<Model.Contract | null>;
  cancel(id: string): Promise<Model.Contract>;
}

export interface MilestonesService {
  list(contractId: string): Promise<Model.Milestone[]>;
  listMine(): Promise<Model.Milestone[]>;
  submit(id: string): Promise<Model.Milestone>;
  accept(id: string): Promise<Model.Milestone>;
  requestRevision(id: string, comment: string): Promise<Model.Milestone>;
}

export interface PaymentsService {
  fundContract(id: string): Promise<Model.Contract>;
  getBalance(): Promise<number>;
  getCards(): Promise<Model.PaymentCard[]>;
  addCard(input: {
    number: string;
    holderName: string;
    expiry: string;
  }): Promise<Model.PaymentCard>;
  removeCard(id: string): Promise<void>;
  /** Mutaxassis daromadini bog'langan kartaga yechish */
  withdrawEarnings(cardId: string): Promise<void>;
  /** Xaridor balansidagi (qaytgan escrow) mablag'ni kartaga yechish */
  withdrawBalance(cardId: string): Promise<number>;
  getWithdrawnTotal(): Promise<number>;
}

export interface MessagesService {
  list(threadId: string): Promise<Model.Message[]>;
  listMine(): Promise<Model.Message[]>;
  send(threadId: string, body: string): Promise<Model.Message>;
}

export interface NotificationsService {
  list(): Promise<Model.AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ReviewsService {
  listMine(): Promise<Model.Review[]>;
  getForContract(contractId: string): Promise<Model.Review | null>;
  create(contractId: string, rating: number, comment: string): Promise<Model.Review>;
}

export interface DisputesService {
  getForContract(contractId: string): Promise<Model.Dispute | null>;
  open(
    contractId: string,
    input: Pick<Model.Dispute, "reason" | "description" | "evidence">
  ): Promise<Model.Dispute>;
}

export interface VerificationService {
  getMine(): Promise<Model.VerificationRecord | null>;
  submit(input: Omit<Model.VerificationRecord, "userId" | "status" | "submittedAt" | "rejectionReason">): Promise<Model.VerificationRecord>;
}

export interface SupportService {
  listMine(): Promise<Model.SupportTicket[]>;
  create(input: Pick<Model.SupportTicket, "topic" | "subject" | "message">): Promise<Model.SupportTicket>;
}

export interface AdminService {
  getSession(): AdminSession | null;
  getCurrent(): AdminAccount | null;
  hasPermission(permission: AdminPermission): boolean;
  getAuditEvents(): AuditEvent[];
}
