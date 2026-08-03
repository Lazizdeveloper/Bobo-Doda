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
  logout(): void;
}

export interface UsersService {
  getCurrent(): Promise<Model.User | null>;
  getSellerProfile(): Promise<Model.SellerProfile>;
  updateName(fullName: string): Promise<void>;
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
  close(id: string): Promise<Model.Job>;
}

export interface ProposalsService {
  listMine(): Promise<Model.Proposal[]>;
  get(id: string): Promise<Model.Proposal | null>;
  listForJob(jobId: string): Promise<Model.Proposal[]>;
  withdraw(id: string): Promise<Model.Proposal>;
}

export interface OffersService {
  get(id: string): Promise<Model.Offer | null>;
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
